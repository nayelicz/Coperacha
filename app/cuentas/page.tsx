"use client";

import { useEffect, useState } from "react";
import { Landmark, Loader2, RefreshCw } from "lucide-react";
import { CLABES_EVENTO } from "@/lib/clabes";

type Cuenta = { clabe: string; bankAccountId: string; codiStatus: string; alias: string; errorMessage?: string };

export default function Cuentas() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [pey, setPey] = useState(false);
  const [f, setF] = useState({ clabe: CLABES_EVENTO[3].clabe as string, name: CLABES_EVENTO[3].nombre as string, entity: "PERSON", bankAccountId: "" });
  const [msg, setMsg] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargar = () => fetch("/api/pey/cuentas").then((r) => r.json()).then((d) => { setCuentas(d.cuentas); setPey(d.peyConfigurado); });
  useEffect(() => { cargar(); }, []);

  async function enviar(cuerpo: Record<string, unknown>) {
    setCargando(true);
    setMsg("");
    const r = await fetch("/api/pey/cuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const d = await r.json();
    setMsg(r.ok ? `Listo: estado ${d.codiStatus}${d.bankAccountId ? ` · bankAccountId ${d.bankAccountId}` : ""}` : d.error);
    setCargando(false);
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold"><Landmark className="h-8 w-8 text-barrio" /> Cuentas en pey</h1>
        <p className="mt-2 text-lg text-gris">
          Para que el dinero llegue <b>directo</b> a cada CLABE (sin pasar por Coperacha), la CLABE debe estar registrada en pey y en estado <b>ACTIVE</b>. El registro en Banxico tarda hasta 5 días hábiles.
        </p>
        {!pey && <p className="mt-3 rounded-xl bg-[#FFF6E0] p-3 text-[#8A5A00]">Falta PEY_API_KEY en .env.local: solo puedes guardar bankAccountId que ya tengas.</p>}
      </div>

      <div className="tarjeta space-y-4 p-6">
        <div>
          <label className="etiqueta">CLABE</label>
          <select className="campo" value={f.clabe} onChange={(e) => { const p = CLABES_EVENTO.find((c) => c.clabe === e.target.value); setF({ ...f, clabe: e.target.value, name: p?.nombre || f.name }); }}>
            {CLABES_EVENTO.map((c) => <option key={c.clabe} value={c.clabe}>{c.nombre} · {c.clabe}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Titular</label>
            <input className="campo" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <label className="etiqueta">Tipo</label>
            <select className="campo" value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })}>
              <option value="PERSON">Persona</option>
              <option value="BUSINESS">Negocio</option>
            </select>
          </div>
        </div>
        <button className="boton-barrio w-full" disabled={cargando || !pey} onClick={() => enviar({ clabe: f.clabe, name: f.name, alias: f.name, entity: f.entity })}>
          {cargando && <Loader2 className="h-5 w-5 animate-spin" />} Registrar en pey
        </button>
        <div className="border-t border-[#F0EBE3] pt-4">
          <label className="etiqueta">¿Ya tienes el bankAccountId (ULID) de esta CLABE?</label>
          <div className="flex gap-2">
            <input className="campo" placeholder="01J…" value={f.bankAccountId} onChange={(e) => setF({ ...f, bankAccountId: e.target.value })} />
            <button className="boton-suave" disabled={cargando || !f.bankAccountId} onClick={() => enviar({ clabe: f.clabe, bankAccountId: f.bankAccountId, alias: f.name })}>Guardar</button>
          </div>
        </div>
        {msg && <p className="rounded-xl bg-crema p-3 font-semibold">{msg}</p>}
      </div>

      <div className="tarjeta p-6">
        <h2 className="text-xl font-extrabold">Registradas</h2>
        {cuentas.length === 0 ? <p className="mt-2 text-gris">Ninguna todavía.</p> : (
          <ul className="mt-2 divide-y divide-[#F0EBE3]">
            {cuentas.map((c) => (
              <li key={c.clabe} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-bold">{c.alias}</p>
                  <p className="font-mono text-sm text-gris">{c.clabe} · {c.bankAccountId}</p>
                  {c.errorMessage && <p className="text-sm text-red-700">{c.errorMessage}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip ${c.codiStatus === "ACTIVE" ? "bg-impulso-suave text-impulso-oscuro" : "bg-[#FFF6E0] text-[#8A5A00]"}`}>{c.codiStatus}</span>
                  {pey && <button className="rounded-lg p-2 hover:bg-crema" title="Consultar estado" onClick={() => enviar({ clabe: c.clabe, refrescar: true })}><RefreshCw className="h-4 w-4" /></button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
