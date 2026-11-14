import { NextResponse } from "next/server";
import { conBase, nuevoId, soloLeer } from "@/lib/db";
import { clabeValida } from "@/lib/clabes";
import { limitePorNivel, vistaPublica } from "@/lib/logica";
import type { Coperacha } from "@/lib/types";

export const dynamic = "force-dynamic";
const DIA = 24 * 60 * 60 * 1000;

export async function GET() {
  const db = await soloLeer();
  const lista = db.coperachas
    .slice()
    .sort((a, b) => Number(Boolean(b.destacada)) - Number(Boolean(a.destacada)) || b.creadaEn.localeCompare(a.creadaEn))
    .map(vistaPublica);
  return NextResponse.json({ coperachas: lista, historial: db.historial });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nombre = String(b.nombre || "").trim();
  const alcaldia = String(b.alcaldia || "").trim();
  const proposito = String(b.proposito || "").trim();
  const monto = Math.round(Number(b.monto));
  const plazo = Number(b.plazoDias);
  const clabe = String(b.clabeDestino || "").replace(/\s/g, "");
  const titular = String(b.titularDestino || "").trim();
  const celular = String(b.celularNegocio || "").replace(/\D/g, "");

  const errores: string[] = [];
  if (nombre.length < 2) errores.push("Escribe el nombre del negocio o persona.");
  if (alcaldia.length < 2) errores.push("Dinos en qué alcaldía o mercado está.");
  if (proposito.length < 3) errores.push("Cuéntanos para qué es el dinero.");
  if (!Number.isFinite(monto) || monto < 100) errores.push("El monto mínimo es $100.");
  if (plazo !== 15 && plazo !== 30) errores.push("El plazo puede ser 15 o 30 días.");
  if (!clabeValida(clabe)) errores.push("La CLABE no es válida (18 dígitos).");
  if (celular && celular.length !== 10) errores.push("El celular debe tener 10 dígitos.");

  const resultado = await conBase((db) => {
    const certificados = db.historial[clabe]?.certificados || 0;
    const limite = limitePorNivel(certificados);
    if (monto > limite) errores.push(`Por ahora puedes pedir hasta $${limite.toLocaleString("es-MX")}. Cada Certificado de Buen Pagador te sube el límite.`);
    if (errores.length) return null;
    const ahora = new Date();
    const c: Coperacha = {
      id: nuevoId("cop_"),
      nombre,
      alcaldia,
      proposito,
      montoMeta: monto,
      plazoDias: plazo as 15 | 30,
      clabeDestino: clabe,
      titularDestino: titular || nombre,
      celularNegocio: celular,
      padronSedeco: Boolean(b.padronSedeco),
      estado: "juntando",
      creadaEn: ahora.toISOString(),
      juntarHasta: new Date(ahora.getTime() + 7 * DIA).toISOString(),
      aportaciones: [],
      sedeco: { monto: Math.round(monto * 0.2 * 100) / 100, desbloqueado: false, simulado: true },
      tarifa: { monto: Math.round(monto * 0.01 * 100) / 100, estado: "no_aplica" },
      regresos: [],
    };
    db.coperachas.push(c);
    return c;
  });

  if (!resultado) return NextResponse.json({ error: errores.join(" ") }, { status: 400 });
  return NextResponse.json({ coperacha: vistaPublica(resultado) }, { status: 201 });
}
