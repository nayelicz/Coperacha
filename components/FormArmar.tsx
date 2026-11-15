"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, Store } from "lucide-react";
import SelectorCuenta from "./SelectorCuenta";
import { Aviso, Hoja } from "./ui";
import { CLABES_EVENTO } from "@/lib/clabes";
import { pesos } from "@/lib/formato";
import { api, mensajeDe } from "@/lib/cliente";

const ALCALDIAS = [
  "Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco",
  "Iztapalapa", "Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco",
];

const TITULOS = ["¿Quién pide el apoyo?", "¿Para qué es y cuánto necesitas?", "¿A qué cuenta te llega?"];

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
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const clabe = f.clabeDestino === "otra" ? f.otraClabe : f.clabeDestino;

  const puedeSeguir =
    paso === 1 ? f.nombre.trim().length >= 2 : paso === 2 ? f.proposito.trim().length >= 3 && f.monto >= 100 : clabe.length === 18;

  async function enviar() {
    setEnviando(true);
    setError("");
    try {
      const d = await api<{ coperacha: { id: string } }>("/api/coperachas", {
        nombre: f.nombre,
        alcaldia: f.mercado ? `${f.alcaldia} · ${f.mercado}` : f.alcaldia,
        proposito: f.proposito,
        monto: f.monto,
        plazoDias: f.plazoDias,
        clabeDestino: clabe,
        titularDestino: f.titularDestino,
        celularNegocio: f.celularNegocio,
        padronSedeco: f.padronSedeco,
      });
      router.push(`/coperacha/${d.coperacha.id}`);
    } catch (e) {
      setError(mensajeDe(e));
      setEnviando(false);
    }
  }

  const opcion = (on: boolean) => `rounded-full px-4 py-2.5 text-[15px] font-semibold transition ${on ? "bg-carbon text-white" : "bg-white/60 hover:bg-white"}`;

  return (
    <Hoja>
      <div className="mb-5 flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1.5 flex-1 rounded-full transition ${n <= paso ? "bg-carbon" : "bg-carbon/10"}`} />
        ))}
      </div>
      <p className="text-[13px] font-semibold text-ceniza">Paso {paso} de 3</p>
      <p className="mb-4 text-[22px] font-bold">{TITULOS[paso - 1]}</p>

      {paso === 1 && (
        <div className="space-y-4">
          <div>
            <label className="etiqueta" htmlFor="negocio">Nombre del negocio o persona</label>
            <input id="negocio" className="campo" placeholder="Ej. Tortillería Doña Lupe" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="alcaldia">Alcaldía</label>
              <select id="alcaldia" className="campo" value={f.alcaldia} onChange={(e) => set("alcaldia", e.target.value)}>
                {ALCALDIAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="etiqueta" htmlFor="mercado">Mercado o colonia <span className="font-normal text-ceniza">(opcional)</span></label>
              <input id="mercado" className="campo" placeholder="Ej. Mercado de Jamaica" value={f.mercado} onChange={(e) => set("mercado", e.target.value)} />
            </div>
          </div>
          <label className={`flex cursor-pointer items-center gap-3 rounded-[22px] p-4 transition ${f.padronSedeco ? "bg-impulso" : "bg-white/60"}`}>
            <input type="checkbox" className="h-6 w-6 accent-carbon" checked={f.padronSedeco} onChange={(e) => set("padronSedeco", e.target.checked)} />
            <span>
              <span className="flex items-center gap-1.5 font-semibold"><BadgeCheck className="h-5 w-5" /> Negocio registrado / Padrón MiPyME SEDECO</span>
              <span className="text-[14px] opacity-70">Así es más fácil que se encienda tu Impulso SEDECO.</span>
            </span>
          </label>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4">
          <div>
            <label className="etiqueta" htmlFor="proposito">¿Para qué es el dinero?</label>
            <input id="proposito" className="campo" placeholder="Ej. Comprar harina y gas para la semana" value={f.proposito} onChange={(e) => set("proposito", e.target.value)} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="monto">¿Cuánto necesitas?</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {[3000, 5000, 8000].map((m) => (
                <button key={m} type="button" onClick={() => set("monto", m)} className={opcion(f.monto === m)}>{pesos(m)}</button>
              ))}
            </div>
            <input id="monto" className="campo cifras" type="number" min={100} step={100} value={f.monto} onChange={(e) => set("monto", Number(e.target.value))} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[22px] bg-barrio p-4 text-carbon">
                <p className="text-[13px] font-semibold opacity-75">Lo junta tu barrio · 80%</p>
                <p className="cifras text-2xl font-bold">{pesos(f.monto * 0.8)}</p>
              </div>
              <div className="rounded-[22px] bg-impulso p-4 text-carbon">
                <p className="text-[13px] font-semibold opacity-75">Impulso SEDECO · 20%</p>
                <p className="cifras text-2xl font-bold">{pesos(f.monto * 0.2)}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="etiqueta">¿En cuánto tiempo lo regresas?</p>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-carbon/[0.06] p-1">
              {[15, 30].map((d) => (
                <button key={d} type="button" onClick={() => set("plazoDias", d)}
                  className={`rounded-full py-2.5 text-[15px] font-semibold transition ${f.plazoDias === d ? "bg-white shadow-sm" : "text-ceniza"}`}>
                  {d} días
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4">
          <div>
            <p className="etiqueta">Tu CLABE <span className="font-normal text-ceniza">(el dinero llega directo, Coperacha no lo guarda)</span></p>
            <SelectorCuenta
              valor={f.clabeDestino}
              onCambio={(v, nombre) => setF((x) => ({ ...x, clabeDestino: v, titularDestino: nombre || x.titularDestino }))}
              otra={f.otraClabe}
              onOtra={(v) => set("otraClabe", v)}
            />
            {f.clabeDestino !== "otra" && <p className="cifras mt-1 text-[13px] text-ceniza">{f.clabeDestino} · autorizada del evento</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="titular">Titular de la cuenta</label>
              <input id="titular" className="campo" value={f.titularDestino} onChange={(e) => set("titularDestino", e.target.value)} />
            </div>
            <div>
              <label className="etiqueta" htmlFor="celneg">Celular del negocio</label>
              <input id="celneg" className="campo cifras" inputMode="numeric" maxLength={10} placeholder="10 dígitos" value={f.celularNegocio}
                onChange={(e) => set("celularNegocio", e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          <p className="text-[13px] text-ceniza">Al celular del negocio le llegan las solicitudes CoDi para regresar el dinero a cada quien.</p>
        </div>
      )}

      {error && <div className="mt-4"><Aviso tipo="error">{error}</Aviso></div>}

      <div className="mt-6 flex gap-2">
        {paso > 1 && (
          <button type="button" className="boton-suave" onClick={() => setPaso(paso - 1)} aria-label="Atrás">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {paso < 3 ? (
          <button type="button" className="boton-carbon flex-1" disabled={!puedeSeguir} onClick={() => setPaso(paso + 1)}>
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
    </Hoja>
  );
}
