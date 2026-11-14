import { conBase, nuevoId } from "./db";
import { crearPushNotification, montoParaPey, nuevoNumRef, peyConfigurado, PeyError } from "./pey";
import { calcularRegresos, esBono, r2, revisarCertificado } from "./logica";
import type { Regreso } from "./types";

/**
 * Cobro independiente de la tarifa Coperacha (1%), solo cuando la meta se completa.
 * Se pide al celular del negocio y se deposita en la cuenta ligada a la API key (la de la plataforma).
 */
export async function cobrarTarifa(coperachaId: string) {
  const datos = await conBase((db) => {
    const c = db.coperachas.find((x) => x.id === coperachaId);
    if (!c || c.tarifa.estado !== "no_aplica") return null;
    c.tarifa.estado = "solicitada";
    return { celular: c.celularNegocio, monto: c.tarifa.monto, modoDemo: db.config.modoDemo, nombre: c.nombre };
  });
  if (!datos) return;

  let resultado: { estado: "solicitada" | "simulada" | "error"; tx?: string; nota?: string };
  if (!peyConfigurado() || !datos.celular) {
    resultado = {
      estado: "simulada",
      nota: !peyConfigurado() ? "Sin PEY_API_KEY: la tarifa se marca como simulada." : "El negocio no dejó celular: la tarifa se marca como simulada.",
    };
  } else {
    try {
      const r = await crearPushNotification({
        amount: montoParaPey(datos.monto, datos.modoDemo),
        phoneNumber: datos.celular,
        concept: `Tarifa Coperacha 1%`.slice(0, 40),
        numRef: nuevoNumRef(),
        metadata: { tipo: "tarifa", coperachaId },
      });
      resultado = { estado: "solicitada", tx: r.transactionId, nota: "Solicitud CoDi enviada al celular del negocio." };
    } catch (e) {
      resultado = { estado: "error", nota: e instanceof PeyError ? e.message : String(e) };
    }
  }
  await conBase((db) => {
    const c = db.coperachas.find((x) => x.id === coperachaId);
    if (!c) return;
    c.tarifa.estado = resultado.estado;
    c.tarifa.peyTransactionId = resultado.tx;
    c.tarifa.nota = resultado.nota;
  });
}

/**
 * Regresar el dinero sin custodia: para cada persona se manda una solicitud CoDi
 * al celular del negocio, con el bankAccountId de la CLABE de esa persona.
 * El negocio autoriza en su app bancaria y el dinero va directo de su cuenta a la de cada quien.
 */
export async function iniciarRegresos(coperachaId: string) {
  const plan = await conBase((db) => {
    const c = db.coperachas.find((x) => x.id === coperachaId);
    if (!c) throw new Error("No existe esa coperacha.");
    if (c.estado !== "completa" && c.estado !== "regresando") throw new Error("Primero se tiene que completar la meta del barrio.");
    if (c.regresos.length === 0) {
      const ahora = new Date().toISOString();
      c.regresos = calcularRegresos(c).map<Regreso>((r) => ({
        ...r,
        id: nuevoId("reg_"),
        montoCobrado: montoParaPey(r.monto, db.config.modoDemo),
        estado: esBono(c, r) ? "bono_emitido" : "por_pedir",
        bonoCodigo: esBono(c, r) ? "BONO-" + nuevoId().toUpperCase().slice(0, 6) : undefined,
        simulado: false,
        actualizadoEn: ahora,
      }));
    }
    c.estado = "regresando";
    revisarCertificado(db, c);
    return {
      celular: c.celularNegocio,
      cuentas: db.cuentas,
      sedecoId: process.env.SEDECO_BANK_ACCOUNT_ID || "",
      pendientes: c.regresos.filter((r) => r.estado === "por_pedir" || r.estado === "error" || r.estado === "requiere_cuenta"),
    };
  });

  const actualizaciones: Partial<Regreso>[] = [];
  for (const r of plan.pendientes) {
    const bankAccountId =
      r.tipo === "sedeco" ? plan.sedecoId : r.clabe && plan.cuentas[r.clabe]?.codiStatus === "ACTIVE" ? plan.cuentas[r.clabe].bankAccountId : "";

    if (!peyConfigurado() || !plan.celular) {
      actualizaciones.push({
        id: r.id,
        estado: "por_pedir",
        nota: !peyConfigurado() ? "Sin PEY_API_KEY: usa “Simular” para probar." : "Falta el celular del negocio para mandar la solicitud CoDi.",
      });
      continue;
    }
    if (!bankAccountId) {
      // Nunca mandamos el regreso a la cuenta de la plataforma: eso sería custodiar dinero.
      actualizaciones.push({
        id: r.id,
        estado: "requiere_cuenta",
        nota:
          r.tipo === "sedeco"
            ? "Falta SEDECO_BANK_ACCOUNT_ID. En demo, simúlalo."
            : "Esta CLABE aún no está registrada y ACTIVE en pey (/cuentas). En demo, simúlalo.",
      });
      continue;
    }
    try {
      const res = await crearPushNotification({
        amount: r.montoCobrado,
        phoneNumber: plan.celular,
        concept: `Regreso Coperacha ${r.paraQuien}`.slice(0, 40),
        numRef: nuevoNumRef(),
        bankAccountId,
        metadata: { tipo: "regreso", regresoId: r.id, coperachaId },
      });
      actualizaciones.push({ id: r.id, estado: "solicitado", peyTransactionId: res.transactionId, codiId: res.codiId, nota: "Solicitud CoDi enviada al celular del negocio." });
    } catch (e) {
      actualizaciones.push({ id: r.id, estado: "error", nota: e instanceof PeyError ? e.message : String(e) });
    }
  }

  return conBase((db) => {
    const c = db.coperachas.find((x) => x.id === coperachaId)!;
    for (const u of actualizaciones) {
      const r = c.regresos.find((x) => x.id === u.id);
      if (r) Object.assign(r, u, { actualizadoEn: new Date().toISOString() });
    }
    revisarCertificado(db, c);
    return {
      enviados: actualizaciones.filter((u) => u.estado === "solicitado").length,
      total: r2(c.regresos.reduce((s, r) => s + r.monto, 0)),
    };
  });
}
