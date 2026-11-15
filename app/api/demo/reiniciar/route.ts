import { NextResponse } from "next/server";
import { reiniciar, soloLeer } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/demo/reiniciar
 * Regresa la base a la historia de Trini para repetir la demo.
 * Solo funciona con el Modo Demo encendido, o con el header x-demo-token = DEMO_RESET_TOKEN.
 */
export async function POST(req: Request) {
  const db = await soloLeer();
  const token = process.env.DEMO_RESET_TOKEN;
  const autorizado = db.config.modoDemo || (token && req.headers.get("x-demo-token") === token);
  if (!autorizado) return NextResponse.json({ error: "Enciende el Modo Demo para reiniciar." }, { status: 403 });
  await reiniciar();
  return NextResponse.json({ ok: true });
}
