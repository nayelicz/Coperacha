import { NextResponse } from "next/server";
import { conBase, nuevoId, soloLeer } from "@/lib/db";
import { clabeValida } from "@/lib/clabes";
import { crearPushNotification, crearQr, montoParaPey, nuevoNumRef, peyConfigurado, PeyError } from "@/lib/pey";
import { faltaBarrio, motivoBloqueo } from "@/lib/logica";
import type { Aportacion, TipoGanancia } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/pey/cobrar
 * Crea una aportación y le pide a pey el cobro CoDi:
 *  - metodo "pn": solicitud al celular de quien aporta (POST /codi/pn)
 *  - metodo "qr": QR para escanear desde su app bancaria (POST /codi/qr)
 * El cobro se deposita directo en la CLABE del negocio (bankAccountId registrado en pey).
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const coperachaId = String(b.coperachaId || "");
  const nombre = String(b.nombre || "").trim();
  const celular = String(b.celular || "").replace(/\D/g, "");
  const clabeRetorno = String(b.clabeRetorno || "").replace(/\s/g, "");
  const monto = Math.round(Number(b.monto) * 100) / 100;
  const ganancia = (b.ganancia === "tienda8" ? "tienda8" : "efectivo4") as TipoGanancia;
  const metodo = b.metodo === "qr" ? "qr" : "pn";

  const errores: string[] = [];
  if (nombre.length < 2) errores.push("Escribe tu nombre.");
  if (metodo === "pn" && celular.length !== 10) errores.push("Tu celular debe tener 10 dígitos (ahí te llega la solicitud CoDi).");
  if (celular && celular.length !== 10) errores.push("Tu celular debe tener 10 dígitos.");
  if (!clabeValida(clabeRetorno)) errores.push("Revisa tu CLABE para recibir tu dinero de vuelta (18 dígitos).");
  if (!Number.isFinite(monto) || monto < 10) errores.push("El monto mínimo es $10.");
  if (errores.length) return NextResponse.json({ error: errores.join(" ") }, { status: 400 });

  // 1) Validar contra el estado actual (sin bloquear la fila mientras llamamos a pey)
  const db = await soloLeer();
  const c = db.coperachas.find((x) => x.id === coperachaId);
  if (!c) return NextResponse.json({ error: "No encontramos esa coperacha." }, { status: 404 });
  const bloqueo = motivoBloqueo(c);
  if (bloqueo) return NextResponse.json({ error: bloqueo, bloqueada: true }, { status: 409 });
  const falta = faltaBarrio(c);
  if (monto > falta) {
    return NextResponse.json({ error: `Ya solo faltan $${falta.toLocaleString("es-MX")} para la meta del barrio. Pon máximo eso.`, falta }, { status: 409 });
  }

  const modoDemo = db.config.modoDemo;
  const montoCobrado = montoParaPey(monto, modoDemo);
  const cuentaNegocio = db.cuentas[c.clabeDestino];
  const bankAccountId = cuentaNegocio?.codiStatus === "ACTIVE" ? cuentaNegocio.bankAccountId : undefined;
  const ahora = new Date();
  const ap: Aportacion = {
    id: nuevoId("ap_"),
    nombre,
    celular,
    clabeRetorno,
    monto,
    montoCobrado,
    ganancia,
    metodo,
    estado: "pendiente",
    modoDemo,
    simulado: false,
    numRef: nuevoNumRef(),
    montoAceptado: 0,
    excedente: 0,
    creadaEn: ahora.toISOString(),
    expiraEn: new Date(ahora.getTime() + (metodo === "qr" ? 600 : 360) * 1000).toISOString(),
  };

  // 2) Pedir el cobro a pey
  const concepto = `Coperacha ${c.nombre}`.slice(0, 40);
  const metadata = { tipo: "aportacion", aportacionId: ap.id, coperachaId: c.id };
  let avisoCuenta: string | undefined;
  if (!bankAccountId) {
    avisoCuenta =
      "La CLABE del negocio aún no está registrada como ACTIVE en pey: el cobro llega a la cuenta ligada a la API key. Regístrala en /cuentas para que llegue directo al negocio.";
  }

  if (peyConfigurado()) {
    try {
      if (metodo === "pn") {
        const r = await crearPushNotification({ amount: montoCobrado, phoneNumber: celular, concept: concepto, numRef: ap.numRef, bankAccountId, metadata });
        ap.peyTransactionId = r.transactionId;
        ap.codiId = r.codiId;
      } else {
        const r = await crearQr({ amount: montoCobrado, concept: concepto, numRef: ap.numRef, bankAccountId, metadata });
        ap.codiQrId = r.id;
        ap.qrString = r.qrString;
      }
      ap.nota = avisoCuenta;
    } catch (e) {
      const msg = e instanceof PeyError ? `${e.message}${e.requestId ? ` (requestId ${e.requestId})` : ""}` : String(e);
      return NextResponse.json({ error: `pey no pudo crear el cobro: ${msg}` }, { status: 502 });
    }
  } else {
    ap.nota = "Sin PEY_API_KEY: este cobro no salió a pey. Usa “Simular pago CoDi confirmado”.";
  }

  // 3) Guardar (volvemos a revisar el bloqueo dentro de la fila)
  const guardado = await conBase((db2) => {
    const c2 = db2.coperachas.find((x) => x.id === coperachaId);
    if (!c2) return { error: "No encontramos esa coperacha." };
    // Si mientras tanto se cerró, igual guardamos: si la persona paga, el webhook lo marcará devolucion_pendiente.
    c2.aportaciones.push(ap);
    return { ok: true };
  });
  if ("error" in guardado) return NextResponse.json(guardado, { status: 404 });

  return NextResponse.json(
    {
      aportacion: { id: ap.id, estado: ap.estado, metodo, monto, montoCobrado, modoDemo, qrString: ap.qrString, expiraEn: ap.expiraEn, enviadoAPey: peyConfigurado() },
      mensaje:
        metodo === "pn"
          ? peyConfigurado()
            ? "Te mandamos la solicitud CoDi a tu celular. Ábrela en tu app del banco y autoriza."
            : "Cobro registrado en modo prueba (sin API key)."
          : "Escanea el QR con la app de tu banco.",
      aviso: avisoCuenta,
    },
    { status: 201 },
  );
}
