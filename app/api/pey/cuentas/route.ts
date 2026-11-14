import { NextResponse } from "next/server";
import { conBase, soloLeer } from "@/lib/db";
import { clabeValida } from "@/lib/clabes";
import { consultarCuenta, peyConfigurado, PeyError, registrarCuenta } from "@/lib/pey";

export const dynamic = "force-dynamic";

// GET: lista de CLABEs registradas en pey
export async function GET() {
  const db = await soloLeer();
  return NextResponse.json({ cuentas: Object.values(db.cuentas), peyConfigurado: peyConfigurado() });
}

/**
 * POST { clabe, name, alias, entity }            → registra la CLABE en pey (POST /bank-account)
 * POST { clabe, bankAccountId }                  → guarda un bankAccountId que ya tienes
 * POST { clabe, refrescar: true }                → consulta el estado (GET /bank-account/:id)
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, string | boolean>;
  const clabe = String(b.clabe || "").replace(/\s/g, "");
  if (!clabeValida(clabe)) return NextResponse.json({ error: "CLABE inválida." }, { status: 400 });

  try {
    if (b.bankAccountId) {
      const id = String(b.bankAccountId);
      let status = "ACTIVE";
      if (peyConfigurado()) status = (await consultarCuenta(id)).codiStatus;
      await conBase((db) => {
        db.cuentas[clabe] = { clabe, bankAccountId: id, codiStatus: status, alias: String(b.alias || clabe), actualizadaEn: new Date().toISOString() };
      });
      return NextResponse.json({ ok: true, codiStatus: status });
    }

    if (!peyConfigurado()) return NextResponse.json({ error: "Falta PEY_API_KEY en .env.local" }, { status: 400 });

    if (b.refrescar) {
      const db = await soloLeer();
      const actual = db.cuentas[clabe];
      if (!actual) return NextResponse.json({ error: "Esa CLABE no está registrada." }, { status: 404 });
      const r = await consultarCuenta(actual.bankAccountId);
      await conBase((db2) => {
        Object.assign(db2.cuentas[clabe], { codiStatus: r.codiStatus, errorMessage: r.errorMessage, actualizadaEn: new Date().toISOString() });
      });
      return NextResponse.json({ ok: true, codiStatus: r.codiStatus });
    }

    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "Escribe el nombre del titular." }, { status: 400 });
    const entity = b.entity === "BUSINESS" ? "BUSINESS" : "PERSON";
    const r = await registrarCuenta({ clabe, name, alias: String(b.alias || name).slice(0, 255), entity });
    await conBase((db) => {
      db.cuentas[clabe] = { clabe, bankAccountId: r.id, codiStatus: r.codiStatus, alias: String(b.alias || name), actualizadaEn: new Date().toISOString() };
    });
    return NextResponse.json({ ok: true, bankAccountId: r.id, codiStatus: r.codiStatus });
  } catch (e) {
    return NextResponse.json({ error: e instanceof PeyError ? e.message : String(e) }, { status: 502 });
  }
}
