import { NextResponse } from "next/server";
import { almacenamiento, conBase, soloLeer } from "@/lib/db";
import { peyConfigurado } from "@/lib/pey";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = await soloLeer();
  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");
  return NextResponse.json({
    modoDemo: db.config.modoDemo,
    peyConfigurado: peyConfigurado(),
    firmaWebhook: Boolean(process.env.PEY_WEBHOOK_SECRET),
    webhookUrl: `${base}/api/pey/webhook`,
    almacenamiento: almacenamiento(),
    sedecoConfigurado: Boolean(process.env.SEDECO_BANK_ACCOUNT_ID),
    cuentasActivas: Object.values(db.cuentas).filter((c) => c.codiStatus === "ACTIVE").length,
    ultimoWebhook: db.procesados.filter((e) => e.clave.startsWith("wh:")).at(-1)?.en || null,
    huerfanos: db.huerfanos.length,
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
