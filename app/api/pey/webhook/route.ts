import { NextResponse } from "next/server";
import { conBase } from "@/lib/db";
import { verificarFirma } from "@/lib/pey";
import { aplicarPago } from "@/lib/logica";
import { cobrarTarifa } from "@/lib/acciones";

export const dynamic = "force-dynamic";

type PayloadPey = {
  type?: string;
  transactionId?: string;
  amount?: number;
  codiQrId?: string;
  bankAccountId?: string;
  codiStatus?: string;
  clabe?: string;
  name?: string;
  id?: string;
  metadata?: { externalMetadata?: Record<string, string>; [k: string]: unknown };
};

/**
 * POST /api/pey/webhook
 * Recibe los eventos de pey:
 *  - codi.qr.payment_received  (pagaron un QR)
 *  - codi.pn.payment_received  (autorizaron una solicitud al celular)
 *  - bank.account.updated     (la CLABE pasó a ACTIVE)
 * Reglas:
 *  - Firma Standard Webhooks (si PEY_WEBHOOK_SECRET está configurado).
 *  - Idempotencia por webhook-id y por transactionId: reintentos de pey no duplican pagos.
 *  - Pagos tardíos o excedentes → devolucion_pendiente.
 */
export async function POST(req: Request) {
  const cuerpo = await req.text();

  const secreto = process.env.PEY_WEBHOOK_SECRET;
  if (secreto) {
    const v = verificarFirma(cuerpo, req.headers, secreto);
    if (!v.ok) return NextResponse.json({ error: v.motivo }, { status: 401 });
  }

  let p: PayloadPey;
  try {
    p = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const webhookId = req.headers.get("webhook-id");

  // Cuenta bancaria actualizada
  if (p.codiStatus && (p.bankAccountId || p.id) && !p.transactionId) {
    const id = p.bankAccountId || p.id!;
    await conBase((db) => {
      let encontrada = false;
      for (const cuenta of Object.values(db.cuentas)) {
        if (cuenta.bankAccountId === id) {
          cuenta.codiStatus = p.codiStatus!;
          cuenta.actualizadaEn = new Date().toISOString();
          encontrada = true;
        }
      }
      // bank.account.updated trae la CLABE: si la registraron desde el portal de pey, también la guardamos.
      if (!encontrada && p.clabe && /^\d{18}$/.test(p.clabe)) {
        db.cuentas[p.clabe] = { clabe: p.clabe, bankAccountId: id, codiStatus: p.codiStatus!, alias: p.name || p.clabe, actualizadaEn: new Date().toISOString() };
      }
    });
    return NextResponse.json({ ok: true, evento: "cuenta_actualizada" });
  }

  if (p.type !== "codi.qr.payment_received" && p.type !== "codi.pn.payment_received") {
    return NextResponse.json({ ok: true, ignorado: p.type || "sin tipo" });
  }
  if (!p.transactionId || typeof p.amount !== "number") {
    return NextResponse.json({ error: "Falta transactionId o amount" }, { status: 400 });
  }

  const extra = (p.metadata?.externalMetadata || p.metadata || {}) as Record<string, unknown>;

  const resultado = await conBase((db) => {
    if (webhookId && db.procesados.some((e) => e.clave === "wh:" + webhookId)) {
      return { tipo: "duplicado" as const, mensaje: `Entrega ${webhookId} ya procesada.` };
    }
    const r = aplicarPago(db, {
      transactionId: p.transactionId!,
      amount: p.amount!,
      aportacionId: typeof extra.aportacionId === "string" ? extra.aportacionId : undefined,
      regresoId: typeof extra.regresoId === "string" ? extra.regresoId : undefined,
      codiQrId: p.codiQrId,
      simulado: false,
    });
    if (webhookId) db.procesados.push({ clave: "wh:" + webhookId, resultado: r.tipo, en: new Date().toISOString() });
    return r;
  });

  if (resultado.tipo === "aplicado" && resultado.completo && "coperachaId" in resultado) {
    await cobrarTarifa(resultado.coperachaId).catch(() => undefined);
  }

  // Siempre 200 para duplicados: así pey deja de reintentar.
  return NextResponse.json({ ok: true, ...resultado });
}
