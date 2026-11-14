"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, Store } from "lucide-react";
import { CLABES_EVENTO } from "@/lib/clabes";
import { pesos } from "@/lib/formato";

const ALCALDIAS = [
  "Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco",
  "Iztapalapa", "Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco",
];

export default function FormArmar() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({
    nombre: "",
    alcaldia: "Cuauhtémoc",
    mercado: "",
    padronSedeco: false,
    proposito: "",
    monto: 5000,
    plazoDias: 30,
    clabeDestino: CLABES_EVENTO[3].clabe as string,
    otraClabe: "",
    titularDestino: CLABES_EVENTO[3].nombre as string,
    celularNegocio: "",
  });
  const set = (k: keyof typeof f, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const clabe = f.clabeDestino === "otra" ? f.otraClabe.replace(/\D/g, "") : f.clabeDestino;

  const puedeSeguir =
    paso === 1 ? f.nombre.trim().length >= 2 : paso === 2 ? f.proposito.trim().length >= 3 && f.monto >= 100 : clabe.length === 18;

  async function enviar() {
    setEnviando(true);
    setError("");
    try {
      const r = await fetch("/api/coperachas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: f.nombre,
          alcaldia: f.mercado ? `${f.alcaldia} · ${f.mercado}` : f.alcaldia,
          proposito: f.proposito,
          monto: f.monto,
          plazoDias: f.plazoDias,
          clabeDestino: clabe,
          titularDestino: f.titularDestino,
          celularNegocio: f.celularNegocio,
          padronSedeco: f.padronSedeco,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(`/coperacha/${d.coperacha.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
      setEnviando(false);
    }
  }

  return (
    <div className="tarjeta p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-2 flex-1 rounded-full ${n <= paso ? "bg-barrio" : "bg-[#EDE6DC]"}`} />
        ))}
      </div>

      {paso === 1 && (
        <div className="space-y-4">
          <p className="text-xl font-extrabold">1. ¿Quién pide el apoyo?</p>
          <div>
            <label className="etiqueta">Nombre del negocio o persona</label>
            <input className="campo" placeholder="Ej. Tortillería Doña Lupe" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Alcaldía</label>
              <select className="campo" value={f.alcaldia} onChange={(e) => set("alcaldia", e.target.value)}>
                {ALCALDIAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Mercado o colonia (opcional)</label>
              <input className="campo" placeholder="Ej. Mercado de Jamaica" value={f.mercado} onChange={(e) => set("mercado", e.target.value)} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-[#EDE6DC] p-4 has-[:checked]:border-impulso has-[:checked]:bg-impulso-suave">
            <input type="checkbox" className="h-6 w-6 accent-impulso" checked={f.padronSedeco} onChange={(e) => set("padronSedeco", e.target.checked)} />
            <span>
              <span className="flex items-center gap-1.5 font-bold">
                <BadgeCheck className="h-5 w-5 text-impulso" /> Soy negocio registrado / Padrón MiPyME SEDECO
              </span>
              <span className="text-sm text-gris">Así es más fácil que se encienda tu Impulso SEDECO.</span>
            </span>
          </label>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4">
          <p className="text-xl font-extrabold">2. ¿Para qué es y cuánto necesitas?</p>
          <div>
            <label className="etiqueta">¿Para qué es el dinero?</label>
            <input className="campo" placeholder="Ej. Comprar harina y gas para la semana" value={f.proposito} onChange={(e) => set("proposito", e.target.value)} />
          </div>
          <div>
            <label className="etiqueta">¿Cuánto necesitas?</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {[3000, 5000, 8000].map((m) => (
                <button key={m} type="button" onClick={() => set("monto", m)} className={`chip border-2 px-4 py-2 text-base ${f.monto === m ? "border-barrio bg-barrio-suave text-barrio-oscuro" : "border-[#EDE6DC] bg-white"}`}>
                  {pesos(m)}
                </button>
              ))}
            </div>
            <input className="campo" type="number" min={100} step={100} value={f.monto} onChange={(e) => set("monto", Number(e.target.value))} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-barrio-suave p-3">
                <p className="text-sm text-barrio-oscuro">Lo junta tu barrio (80%)</p>
                <p className="text-xl font-extrabold text-barrio-oscuro">{pesos(f.monto * 0.8)}</p>
              </div>
              <div className="rounded-xl bg-impulso-suave p-3">
                <p className="text-sm text-impulso-oscuro">Impulso SEDECO (20%, 0% interés)</p>
                <p className="text-xl font-extrabold text-impulso-oscuro">{pesos(f.monto * 0.2)}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="etiqueta">¿En cuánto tiempo lo regresas?</label>
            <div className="grid grid-cols-2 gap-2">
              {[15, 30].map((d) => (
                <button key={d} type="button" onClick={() => set("plazoDias", d)} className={`rounded-xl border-2 p-4 text-lg font-bold ${f.plazoDias === d ? "border-barrio bg-barrio-suave text-barrio-oscuro" : "border-[#EDE6DC] bg-white"}`}>
                  {d} días
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4">
          <p className="text-xl font-extrabold">3. ¿A qué cuenta te llega?</p>
          <div>
            <label className="etiqueta">Tu CLABE (el dinero llega directo, Coperacha no lo guarda)</label>
            <select
              className="campo"
              value={f.clabeDestino}
              onChange={(e) => {
                const v = e.target.value;
                const p = CLABES_EVENTO.find((c) => c.clabe === v);
                setF((x) => ({ ...x, clabeDestino: v, titularDestino: p ? p.nombre : x.titularDestino }));
              }}
            >
              {CLABES_EVENTO.map((c) => (
                <option key={c.clabe} value={c.clabe}>
                  {c.nombre} · {c.clabe} (autorizada del evento)
                </option>
              ))}
              <option value="otra">Otra CLABE…</option>
            </select>
            {f.clabeDestino === "otra" && (
              <input className="campo mt-2" inputMode="numeric" maxLength={18} placeholder="18 dígitos" value={f.otraClabe} onChange={(e) => set("otraClabe", e.target.value)} />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Titular de la cuenta</label>
              <input className="campo" value={f.titularDestino} onChange={(e) => set("titularDestino", e.target.value)} />
            </div>
            <div>
              <label className="etiqueta">Celular del negocio</label>
              <input className="campo" inputMode="numeric" maxLength={10} placeholder="10 dígitos" value={f.celularNegocio} onChange={(e) => set("celularNegocio", e.target.value.replace(/\D/g, ""))} />
              <p className="mt-1 text-sm text-gris">Ahí te llegan las solicitudes CoDi para regresar el dinero.</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 font-semibold text-red-700">{error}</p>}

      <div className="mt-6 flex gap-3">
        {paso > 1 && (
          <button type="button" className="boton-suave" onClick={() => setPaso(paso - 1)}>
            <ArrowLeft className="h-5 w-5" /> Atrás
          </button>
        )}
        {paso < 3 ? (
          <button type="button" className="boton-barrio flex-1" disabled={!puedeSeguir} onClick={() => setPaso(paso + 1)}>
            Siguiente <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button type="button" className="boton-barrio flex-1" disabled={!puedeSeguir || enviando} onClick={enviar}>
            {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Store className="h-5 w-5" />}
            Armar mi coperacha
            {!enviando && <Check className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
