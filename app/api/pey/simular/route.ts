import { NextResponse } from "next/server";
import { conBase, nuevoId } from "@/lib/db";
import { aplicarPago } from "@/lib/logica";
import { cobrarTarifa } from "@/lib/acciones";

export const dynamic = "force-dynamic";

/**
 * POST /api/pey/simular  { aportacionId } | { regresoId }
 * Simula que pey avisó "pago CoDi confirmado". Pasa por la MISMA lógica que el webhook real,
 * pero queda marcado como simulado (y así se ve en pantalla).
 */
export async function POST(req: Request) {
  const { aportacionId, regresoId } = (await req.json().catch(() => ({}))) as { aportacionId?: string; regresoId?: string };
  if (!aportacionId && !regresoId) return NextResponse.json({ error: "Falta aportacionId o regresoId" }, { status: 400 });

  const resultado = await conBase((db) => {
    let monto = 0.01;
    for (const c of db.coperachas) {
      const a = c.aportaciones.find((x) => x.id === aportacionId);
      if (a) monto = a.montoCobrado;
      const r = c.regresos.find((x) => x.id === regresoId);
      if (r) monto = r.montoCobrado;
    }
    return aplicarPago(db, { transactionId: nuevoId("sim_"), amount: monto, aportacionId, regresoId, simulado: true });
  });

  if (resultado.tipo === "aplicado" && resultado.completo) {
    await cobrarTarifa(resultado.coperachaId).catch(() => undefined);
  }
  return NextResponse.json(resultado);
}
