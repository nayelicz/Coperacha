"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clock, FlaskConical, Loader2, PartyPopper, QrCode, Smartphone } from "lucide-react";
import Insignia from "./Insignia";
import QrCoDi from "./QrCoDi";
import SelectorCuenta from "./SelectorCuenta";
import BotonSimular from "./BotonSimular";
import { Aviso, Hoja } from "./ui";
import { CLABES_EVENTO } from "@/lib/clabes";
import { pesos } from "@/lib/formato";
import { api, mensajeDe, type RespuestaCoperacha } from "@/lib/cliente";

type Cobro = { id: string; metodo: "pn" | "qr"; monto: number; montoCobrado: number; qrString?: string; enviadoAPey: boolean; mensaje: string; aviso?: string };
type Ganancia = "efectivo4" | "tienda8";

const RAPIDOS = [50, 100, 200, 500];

/** "Entrarle" en una sola pantalla: monto → nombre → cuenta → ganancia → pagar con CoDi. */
export default function Entrarle({ datos, alTerminar }: { datos: RespuestaCoperacha; alTerminar: () => void }) {
  const c = datos.coperacha;
  const falta = c.calculo.faltaBarrio;
  const [monto, setMonto] = useState(Math.min(200, falta) || 0);
  const [nombre, setNombre] = useState("");
  const [clabeSel, setClabeSel] = useState<string>(CLABES_EVENTO[0].clabe);
  const [otraClabe, setOtraClabe] = useState("");
  const [ganancia, setGanancia] = useState<Ganancia>("efectivo4");
  const [metodo, setMetodo] = useState<"qr" | "pn">("qr");
  const [celular, setCelular] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [verExito, setVerExito] = useState(false);

  const clabe = clabeSel === "otra" ? otraClabe : clabeSel;
  const recibe = monto * (ganancia === "efectivo4" ? 1.04 : 1.08);
  const miAportacion = cobro ? c.aportaciones.find((a) => a.id === cobro.id) : undefined;
  const listo = Boolean(miAportacion && miAportacion.estado !== "pendiente");

  useEffect(() => {
    if (listo && miAportacion?.estado === "confirmada") setVerExito(true);
  }, [listo, miAportacion?.estado]);

  if (c.estado !== "juntando" && !cobro) return <Cerrada id={c.id} vencida={c.estado === "vencida"} />;

  async function pagar() {
    setEnviando(true);
    setError("");
    try {
      const d = await api<{ aportacion: Omit<Cobro, "mensaje" | "aviso">; mensaje: string; aviso?: string }>("/api/pey/cobrar", {
        coperachaId: c.id, nombre, celular, clabeRetorno: clabe, monto, ganancia, metodo,
      });
      setCobro({ ...d.aportacion, mensaje: d.mensaje, aviso: d.aviso });
      alTerminar();
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  }

  /* ---------- Esperando / listo ---------- */
  if (cobro) {
    return (
      <>
        {verExito && miAportacion && (
          <Exito monto={cobro.monto} nombre={nombre} onCerrar={() => setVerExito(false)}
            insignia={<Insignia estado={miAportacion.estado} simulado={miAportacion.simulado} modoDemo={miAportacion.modoDemo} />} />
        )}
        <Hoja>
          {listo && miAportacion ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-impulso text-carbon"><Check className="h-8 w-8" /></span>
              <p className="mt-3 text-2xl font-bold">¡Gracias, {nombre.split(" ")[0]}!</p>
              <p className="mt-1 text-ceniza">
                {miAportacion.estado === "devolucion_pendiente"
                  ? "Tu pago llegó cuando la meta ya estaba completa: se te regresa completo."
                  : `Tu aportación de ${pesos(cobro.monto)} ya cuenta para el barrio.`}
              </p>
              <div className="mt-3 flex justify-center"><Insignia estado={miAportacion.estado} simulado={miAportacion.simulado} modoDemo={miAportacion.modoDemo} /></div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[22px] font-bold">{cobro.metodo === "qr" ? "Escanéalo con tu app del banco" : "Autoriza en tu celular"}</p>
              <p className="mt-1 text-ceniza">
                {cobro.metodo === "qr" ? "Abre tu banco → CoDi → Escanear." : "Abre la notificación CoDi de tu banco y toca Autorizar (6 min)."}
              </p>
              {cobro.qrString && <div className="mt-4 flex justify-center"><QrCoDi valor={cobro.qrString} /></div>}
              {cobro.metodo === "pn" && (
                <span className="mx-auto mt-4 grid h-16 w-16 place-items-center rounded-full bg-carbon text-white"><Smartphone className="h-7 w-7" /></span>
              )}
              <p className="mt-4 flex items-center justify-center gap-2 text-ceniza">
                <Loader2 className="h-5 w-5 animate-spin" /> Esperando confirmación de CoDi…
              </p>
              {cobro.montoCobrado !== cobro.monto && (
                <p className="mt-2 text-[13px] text-ceniza">Modo Demo: se cobra {pesos(cobro.montoCobrado, true)}, cuenta como {pesos(cobro.monto)}.</p>
              )}
              {!cobro.enviadoAPey && <p className="mt-2 text-[13px] text-ceniza">{cobro.mensaje}</p>}
              {cobro.aviso && <div className="mt-3 text-left"><Aviso><AlertTriangle className="h-4 w-4 shrink-0" /> {cobro.aviso}</Aviso></div>}
              {datos.modoDemo && <div className="mt-4 flex justify-center"><BotonSimular aportacionId={cobro.id} alTerminar={alTerminar} /></div>}
            </div>
          )}
          {c.estado === "juntando" && (
            <button className="boton-suave mt-5 w-full" onClick={() => { setCobro(null); setVerExito(false); }}>Hacer otra aportación</button>
          )}
        </Hoja>
      </>
    );
  }

  /* ---------- Formulario único ---------- */
  const puede = !enviando && nombre.trim().length >= 2 && monto >= 10 && monto <= falta && clabe.length === 18 && (metodo === "qr" || celular.length === 10);
  return (
    <Hoja>
      <p className="text-center text-[15px] font-semibold text-ceniza">Entrarle a esta coperacha</p>
      <p className="cifras mt-2 text-center text-[56px] font-bold leading-none tracking-tight">{pesos(monto)}</p>
      <p className="mt-1 text-center text-[14px] text-ceniza">
        Recibes <b className="cifras text-carbon">{pesos(recibe, true)}</b> {ganancia === "tienda8" ? "en saldo del negocio" : "en tu banco"} · faltan {pesos(falta)}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {RAPIDOS.filter((m) => m <= falta).map((m) => (
          <button key={m} type="button" onClick={() => setMonto(m)}
            className={`cifras rounded-full px-4 py-2 text-[15px] font-semibold transition ${monto === m ? "bg-carbon text-white" : "bg-white/60 hover:bg-white"}`}>
            {pesos(m)}
          </button>
        ))}
        <input aria-label="Otro monto" inputMode="numeric" placeholder="Otro" className="cifras w-24 rounded-full bg-white/60 px-4 py-2 text-center text-[15px] font-semibold outline-none focus:bg-white"
          value={RAPIDOS.includes(monto) ? "" : monto || ""} onChange={(e) => setMonto(Number(e.target.value.replace(/\D/g, "")) || 0)} />
      </div>

      <div className="mt-5 space-y-4">
        <input id="nombre" className="campo" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Tu nombre" />

        <div className="grid grid-cols-2 gap-1 rounded-full bg-carbon/[0.06] p-1 text-[14px] font-semibold">
          {([["efectivo4", "+4% a tu banco"], ["tienda8", "+8% en el negocio"]] as const).map(([v, t]) => (
            <button key={v} type="button" onClick={() => setGanancia(v)} aria-pressed={ganancia === v}
              className={`rounded-full py-2.5 transition ${ganancia === v ? (v === "efectivo4" ? "bg-sol" : "bg-impulso") + " shadow-sm" : "text-ceniza"}`}>
              {t}
            </button>
          ))}
        </div>

        <div>
          <p className="etiqueta">¿A qué cuenta te regresamos tu dinero?</p>
          <SelectorCuenta valor={clabeSel} onCambio={(v) => setClabeSel(v)} otra={otraClabe} onOtra={setOtraClabe} />
        </div>

        {metodo === "pn" && (
          <input className="campo cifras" inputMode="numeric" maxLength={10} placeholder="Tu celular · 10 dígitos" value={celular}
            onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))} aria-label="Tu celular" autoFocus />
        )}
      </div>

      {error && <div className="mt-4"><Aviso tipo="error">{error}</Aviso></div>}

      <button className="boton-barrio mt-5 w-full py-4 text-lg" disabled={!puede} onClick={pagar}>
        {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : metodo === "qr" ? <QrCode className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        Pagar {pesos(monto)} con CoDi
      </button>
      <button type="button" onClick={() => setMetodo(metodo === "qr" ? "pn" : "qr")} className="mt-3 w-full text-center text-[14px] font-semibold text-ceniza underline-offset-4 hover:underline">
        {metodo === "qr" ? "Prefiero que me llegue la solicitud a mi celular" : "Prefiero escanear un código QR"}
      </button>
      {datos.modoDemo && (
        <p className="mt-2 flex items-center justify-center gap-1 text-[12px] text-ceniza"><FlaskConical className="h-3.5 w-3.5" /> Modo Demo: se cobra $0.01 real</p>
      )}
    </Hoja>
  );
}

function Cerrada({ id, vencida }: { id: string; vencida: boolean }) {
  return (
    <Hoja className="text-center">
      <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${vencida ? "bg-carbon/10 text-ceniza" : "bg-impulso text-carbon"}`}>
        {vencida ? <Clock className="h-8 w-8" /> : <PartyPopper className="h-8 w-8" />}
      </span>
      <p className="mt-4 text-2xl font-bold">{vencida ? "Se acabó el tiempo" : "¡Meta juntada!"}</p>
      <p className="mt-2 text-ceniza">
        {vencida ? "Ya no recibe aportaciones. Si alguien paga tarde, se le regresa completo." : "Ya no se aceptan aportaciones. Si alguien paga tarde, se le regresa completo."}
      </p>
      {!vencida && <Link href={`/coperacha/${id}/pagar`} className="boton-carbon mt-5 w-full">Ver lo que le toca a cada quien</Link>}
    </Hoja>
  );
}

/** Pantalla verde de "¡listo!". */
function Exito({ monto, nombre, insignia, onCerrar }: { monto: number; nombre: string; insignia: React.ReactNode; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex animate-aparecer flex-col items-center justify-center bg-impulso p-6 text-carbon" role="dialog" aria-modal="true">
      <span className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-carbon/80"><Check className="h-10 w-10" strokeWidth={2.5} /></span>
      <p className="cifras mt-6 text-[64px] font-bold leading-none tracking-tight">{pesos(monto)}</p>
      <p className="mt-3 text-xl font-semibold">¡Gracias, {nombre.split(" ")[0] || "vecino"}!</p>
      <p className="mt-1 text-carbon/70">Ya cuenta para el barrio.</p>
      <div className="mt-5">{insignia}</div>
      <button className="boton-carbon mt-10 w-full max-w-xs" onClick={onCerrar} autoFocus>Listo</button>
    </div>
  );
}
