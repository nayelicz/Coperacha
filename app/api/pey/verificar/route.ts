import { NextResponse } from "next/server";
import { verificarConPey } from "@/lib/acciones";

export const dynamic = "force-dynamic";

/**
 * POST /api/pey/verificar  { coperachaId }
 * Respaldo del webhook: consulta en pey (GET /transaction/:id) las solicitudes CoDi pendientes
 * y aplica las que ya están PAID. Idempotente con el webhook (mismo transactionId).
 */
export async function POST(req: Request) {
  const { coperachaId } = (await req.json().catch(() => ({}))) as { coperachaId?: string };
  if (!coperachaId) return NextResponse.json({ error: "Falta coperachaId" }, { status: 400 });
  return NextResponse.json(await verificarConPey(coperachaId));
}
