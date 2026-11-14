import { NextResponse } from "next/server";
import { iniciarRegresos } from "@/lib/acciones";

export const dynamic = "force-dynamic";

/**
 * POST /api/pey/regresar  { coperachaId }
 * Calcula lo que le toca a cada quien y manda las solicitudes CoDi al celular del negocio,
 * cada una con el bankAccountId de la CLABE de quien recibe (sin pasar por Coperacha).
 */
export async function POST(req: Request) {
  const { coperachaId } = (await req.json().catch(() => ({}))) as { coperachaId?: string };
  if (!coperachaId) return NextResponse.json({ error: "Falta coperachaId" }, { status: 400 });
  try {
    const r = await iniciarRegresos(coperachaId);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
