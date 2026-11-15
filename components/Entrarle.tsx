"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Banknote, Check, Clock, FlaskConical, HandHeart, Loader2, PartyPopper, QrCode, ShoppingBag, Smartphone,
} from "lucide-react";
import Insignia from "./Insignia";
import QrCoDi from "./QrCoDi";
import Teclado from "./Teclado";
import SelectorCuenta from "./SelectorCuenta";
import BotonSimular from "./BotonSimular";
import { Aviso, Hoja } from "./ui";
import { CLABES_EVENTO } from "@/lib/clabes";
import { pesos } from "@/lib/formato";
import { api, mensajeDe, type RespuestaCoperacha } from "@/lib/cliente";

type Cobro = { id: string; metodo: "pn" | "qr"; monto: number; montoCobrado: number; qrString?: string; enviadoAPey: boolean; mensaje: string; aviso?: string };
type Ganancia = "efectivo4" | "tienda8";

const RAPIDOS = [50, 100, 200, 500];

/** Tarjeta "Entrarle a esta coperacha": monto con teclado → datos → esperar CoDi → ¡listo! */
export default function Entrarle({ datos, alTerminar }: { datos: RespuestaCoperacha; alTerminar: () => void }) {
  const c = datos.coperacha;
  const [paso, setPaso] = useState<"monto" | "datos">("monto");
  const [monto, setMonto] = useState("200");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [clabeSel, setClabeSel] = useState<string>(CLABES_EVENTO[0].clabe);
  const [otraClabe, setOtraClabe] = useState("");
  const [ganancia, setGanancia] = useState<Ganancia>("efectivo4");
  const [metodo, setMetodo] = useState<"pn" | "qr">("pn");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [verExito, setVerExito] = useState(false);

  const montoNum = Number(monto) || 0;
  const clabe = clabeSel === "otra" ? otraClabe : clabeSel;
  const ganas = montoNum * (ganancia === "efectivo4" ? 0.04 : 0.08);
  const falta = c.calculo.faltaBarrio;
  const miAportacion = cobro ? c.aportaciones.find((a) => a.id === cobro.id) : undefined;
  const listo = Boolean(miAportacion && miAportacion.estado !== "pendiente");

  // Cuando el webhook (o la simulación) confirma el pago, se muestra la pantalla verde.
  useEffect(() => {
    if (listo && miAportacion?.estado === "confirmada") setVerExito(true);
  }, [listo, miAportacion?.estado]);

  if (c.estado !== "juntando" && !cobro) return <Cerrada id={c.id} vencida={c.estado === "vencida"} />;

  async function entrarle() {
    setEnviando(true);
    setError("");
    try {
      const d = await api<{ aportacion: Omit<Cobro, "mensaje" | "aviso">; mensaje: string; aviso?: string }>("/api/pey/cobrar", {
        coperachaId: c.id, nombre, celular, clabeRetorno: clabe, monto: montoNum, ganancia, metodo,
      });
      setCobro({ ...d.aportacion, mensaje: d.mensaje, aviso: d.aviso });
      alTerminar();
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  }

  function otraVez() {
    setCobro(null);
    setVerExito(false);
    setPaso("monto");
  }

  /* ---------- Después de pedir el cobro ---------- */
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
            <div>
              <p className="text-[22px] font-bold">{cobro.metodo === "qr" ? "Escanea con tu app del banco" : "Revisa tu celular"}</p>
              <p className="mt-1 text-ceniza">{cobro.mensaje}</p>
              {cobro.qrString && <div className="mt-4 flex justify-center"><QrCoDi valor={cobro.qrString} /></div>}
              {cobro.metodo === "pn" && cobro.enviadoAPey && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-carbon text-white"><Smartphone className="h-5 w-5" /></span>
                  <p className="text-[15px]">Abre la notificación CoDi de tu banco y toca <b>Autorizar</b>. Tienes 6 minutos.</p>
                </div>
              )}
              <div className="mt-5 flex items-center justify-center gap-2 text-ceniza">
                <Loader2 className="h-5 w-5 animate-spin" /> Esperando confirmación de Banxico…
              </div>
              <div className="mt-4 space-y-2">
                {cobro.montoCobrado !== cobro.monto && (
                  <Aviso tipo="info"><FlaskConical className="h-4 w-4 shrink-0" /> Modo Demo: tu aportación cuenta como {pesos(cobro.monto)}, pero el cobro real es de {pesos(cobro.montoCobrado, true)}.</Aviso>
                )}
                {cobro.aviso && <Aviso><AlertTriangle className="h-4 w-4 shrink-0" /> {cobro.aviso}</Aviso>}
              </div>
              <div className="mt-4 flex justify-center"><BotonSimular aportacionId={cobro.id} alTerminar={alTerminar} /></div>
            </div>
          )}
          {c.estado === "juntando" && (
            <button className="boton-suave mt-5 w-full" onClick={otraVez}>Hacer otra aportación</button>
          )}
        </Hoja>
      </>
    );
  }

  /* ---------- Paso 1: monto con teclado ---------- */
  if (paso === "monto") {
    const pasa = montoNum > falta;
    return (
      <Hoja>
        <p className="text-center text-[15px] font-semibold text-ceniza">Entrarle a esta coperacha</p>
        <p className="cifras mt-4 text-center text-[64px] font-bold leading-none tracking-tight">
          <span className="mr-1 text-[0.55em] align-top">$</span>{montoNum.toLocaleString("es-MX")}
        </p>
        <p className={`mt-2 text-center text-[14px] ${pasa ? "font-semibold text-barrio-oscuro" : "text-ceniza"}`}>
          {pasa ? `Solo faltan ${pesos(falta)} para la meta` : `Faltan ${pesos(falta)} · pon lo que puedas`}
        </p>
        {datos.modoDemo && (
          <p className="mt-1 flex items-center justify-center gap-1 text-[13px] font-medium text-ceniza">
            <FlaskConical className="h-3.5 w-3.5" /> Modo Demo: se cobra $0.01 de verdad
          </p>
        )}

        <div className="mt-4 flex justify-center gap-2">
          {RAPIDOS.map((m) => (
            <button key={m} type="button" onClick={() => setMonto(String(m))}
              className={`cifras rounded-full px-3.5 py-1.5 text-[15px] font-semibold transition ${montoNum === m ? "bg-carbon text-white" : "bg-white/60 hover:bg-white"}`}>
              {pesos(m)}
            </button>
          ))}
        </div>

        <div className="mt-3"><Teclado valor={monto} onCambio={setMonto} /></div>

        <button className="boton-carbon mt-3 w-full" disabled={montoNum < 1 || pasa} onClick={() => setPaso("datos")}>
          Continuar <ArrowRight className="h-5 w-5" />
        </button>
      </Hoja>
    );
  }

  /* ---------- Paso 2: datos, ganancia y método ---------- */
  const puedeEnviar = !enviando && nombre.trim() && montoNum > 0 && clabe.length === 18 && (metodo === "qr" || celular.length === 10);
  return (
    <Hoja>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setPaso("monto")} className="flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-[14px] font-semibold hover:bg-white">
          <ArrowLeft className="h-4 w-4" /> {pesos(montoNum)}
        </button>
        <p className="text-[15px] font-semibold text-ceniza">Tus datos</p>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="etiqueta" htmlFor="nombre">Tu nombre</label>
          <input id="nombre" className="campo" placeholder="Ej. Don Chuy" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div>
          <p className="etiqueta">¿Cómo quieres tu ganancia?</p>
          <div className="grid grid-cols-2 gap-2">
            <OpcionGanancia activa={ganancia === "efectivo4"} onClick={() => setGanancia("efectivo4")} fondo="bg-sol" icono={<Banknote className="h-5 w-5" />} pct="+4%" texto="en efectivo a tu banco" />
            <OpcionGanancia activa={ganancia === "tienda8"} onClick={() => setGanancia("tienda8")} fondo="bg-impulso" icono={<ShoppingBag className="h-5 w-5" />} pct="+8%" texto="para gastar en el negocio" />
          </div>
          <p className="mt-2 text-center text-[15px] text-ceniza">
            Recibes <b className="cifras text-carbon">{pesos(montoNum + ganas)}</b> {ganancia === "tienda8" ? "en saldo" : "a tu banco"}
          </p>
        </div>

        <div>
          <p className="etiqueta">¿A qué CLABE te regresamos tu dinero?</p>
          <SelectorCuenta valor={clabeSel} onCambio={(v) => setClabeSel(v)} otra={otraClabe} onOtra={setOtraClabe} />
        </div>

        <div>
          <p className="etiqueta">¿Cómo pagas con CoDi?</p>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-carbon/[0.06] p-1 text-[15px] font-semibold">
            <button type="button" onClick={() => setMetodo("pn")} className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 transition ${metodo === "pn" ? "bg-white shadow-sm" : "text-ceniza"}`}>
              <Smartphone className="h-4 w-4" /> A mi celular
            </button>
            <button type="button" onClick={() => setMetodo("qr")} className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 transition ${metodo === "qr" ? "bg-white shadow-sm" : "text-ceniza"}`}>
              <QrCode className="h-4 w-4" /> Código QR
            </button>
          </div>
          {metodo === "pn" && (
            <input className="campo cifras mt-2" inputMode="numeric" maxLength={10} placeholder="Tu celular · 10 dígitos" value={celular}
              onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))} aria-label="Tu celular" />
          )}
        </div>
      </div>

      {error && <div className="mt-4"><Aviso tipo="error">{error}</Aviso></div>}

      <button className="boton-barrio mt-5 w-full py-4 text-lg" disabled={!puedeEnviar} onClick={entrarle}>
        {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <HandHeart className="h-5 w-5" />}
        Entrarle con {pesos(montoNum)}
      </button>
      <p className="mt-3 text-center text-[13px] text-ceniza">Pagas desde tu app del banco con CoDi. Coperacha nunca guarda tu dinero.</p>
    </Hoja>
  );
}

function OpcionGanancia({ activa, onClick, fondo, icono, pct, texto }: { activa: boolean; onClick: () => void; fondo: string; icono: React.ReactNode; pct: string; texto: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activa}
      className={`relative rounded-[22px] p-4 text-left text-carbon transition ${activa ? `${fondo} ring-2 ring-carbon` : "bg-white/60 hover:bg-white"}`}>
      {icono}
      <p className="cifras mt-2 text-[28px] font-bold leading-none">{pct}</p>
      <p className="mt-1 text-[13px] font-semibold leading-snug">{texto}</p>
      {activa && <Check className="absolute right-3 top-3 h-5 w-5" />}
    </button>
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
        {vencida
          ? "Esta coperacha ya no recibe aportaciones. Si alguien paga tarde, se le regresa completo."
          : "Ya no se aceptan más aportaciones. Si alguien paga tarde, su dinero queda marcado para regresárselo."}
      </p>
      {!vencida && (
        <Link href={`/coperacha/${id}/pagar`} className="boton-carbon mt-5 w-full">Ver lo que le toca a cada quien</Link>
      )}
    </Hoja>
  );
}

/** Pantalla verde de "¡listo!" (como la confirmación del diseño). */
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
