import { NextResponse } from "next/server";
import { conBase, soloLeer } from "@/lib/db";
import { vistaPublica } from "@/lib/logica";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = await soloLeer();
  const c = db.coperachas.find((x) => x.id === params.id);
  if (!c) return NextResponse.json({ error: "No encontramos esa coperacha." }, { status: 404 });
  return NextResponse.json({
    coperacha: vistaPublica(c),
    modoDemo: db.config.modoDemo,
    cuentaNegocioActiva: db.cuentas[c.clabeDestino]?.codiStatus === "ACTIVE",
    certificados: db.historial[c.clabeDestino]?.certificados || 0,
  });
}

// Guardar el celular del negocio (para regresar el dinero con CoDi)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { celularNegocio } = (await req.json().catch(() => ({}))) as { celularNegocio?: string };
  const cel = String(celularNegocio || "").replace(/\D/g, "");
  if (cel.length !== 10) return NextResponse.json({ error: "El celular debe tener 10 dígitos." }, { status: 400 });
  const ok = await conBase((db) => {
    const c = db.coperachas.find((x) => x.id === params.id);
    if (!c) return false;
    c.celularNegocio = cel;
    return true;
  });
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "No existe." }, { status: 404 });
}
