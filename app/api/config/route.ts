import { NextResponse } from "next/server";
import { conBase, soloLeer } from "@/lib/db";
import { peyConfigurado } from "@/lib/pey";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await soloLeer();
  return NextResponse.json({
    modoDemo: db.config.modoDemo,
    peyConfigurado: peyConfigurado(),
    firmaWebhook: Boolean(process.env.PEY_WEBHOOK_SECRET),
  });
}

export async function POST(req: Request) {
  const { modoDemo } = (await req.json().catch(() => ({}))) as { modoDemo?: boolean };
  const valor = await conBase((db) => {
    db.config.modoDemo = Boolean(modoDemo);
    return db.config.modoDemo;
  });
  return NextResponse.json({ modoDemo: valor });
}
