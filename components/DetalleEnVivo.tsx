"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, BadgeCheck, Banknote, Check, Clock, Coins, Copy, FlaskConical, HandHeart, Loader2, Lock, MapPin,
  PartyPopper, QrCode, Share2, ShoppingBag, Smartphone, Sparkles, Users,
} from "lucide-react";
import Progreso from "./Progreso";
import Pasos from "./Pasos";
import Insignia from "./Insignia";
import QrCoDi from "./QrCoDi";
import { ETIQUETA_ESTADO } from "./TarjetaCoperacha";
import { CLABES_EVENTO } from "@/lib/clabes";
import { diasRestantes, horaCorta, pesos } from "@/lib/formato";
import type { CoperachaPublica } from "@/lib/logica";

type Respuesta = { coperacha: CoperachaPublica; modoDemo: boolean; cuentaNegocioActiva: boolean };
type Cobro = { id: string; metodo: "pn" | "qr"; monto: number; montoCobrado: number; qrString?: string; enviadoAPey: boolean; mensaje: string; aviso?: string };

export default function DetalleEnVivo({ id }: { id: string }) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [fiesta, setFiesta] = useState(false);
  const antes = useRef<boolean | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/coperachas/${id}`, { cache: "no-store" });
    if (r.status === 404) return setNoExiste(true);
    const d = (await r.json()) as Respuesta;
    if (antes.current === false && d.coperacha.sedeco.desbloqueado) {
      setFiesta(true);
      setTimeout(() => setFiesta(false), 6000);
    }
    antes.current = d.coperacha.sedeco.desbloqueado;
    setDatos(d);
  }, [id]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 3000); // en vivo: cada 3 segundos
    const alCambiarDemo = () => cargar();
    window.addEventListener("modo-demo", alCambiarDemo);
    return () => {
      clearInterval(t);
      window.removeEventListener("modo-demo", alCambiarDemo);
    };
  }, [cargar]);

  if (noExiste)
    return (
      <div className="tarjeta mx-auto max-w-lg p-8 text-center">
        <p className="text-2xl font-extrabold">No encontramos esta coperacha</p>
        <Link href="/" className="boton-barrio mt-6">Ir al inicio</Link>
      </div>
    );
  if (!datos) return <div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-barrio" /></div>;

  const c = datos.coperacha;
  const e = ETIQUETA_ESTADO[c.estado];
  const visibles = c.aportaciones.slice().reverse();

  return (
    <div>
      {fiesta && <Confeti />}

      <Pasos
        titulo={c.estado === "juntando" ? "Entrarle es fácil: pon lo que puedas y gana" : "Así va esta coperacha"}
        pasos={[
          { icono: HandHeart, texto: "Elige cuánto poner" },
          { icono: Smartphone, texto: "Autoriza en tu banco con CoDi" },
          { icono: Coins, texto: "Recibe tu ganancia" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Columna principal */}
        <div className="space-y-6">
          <section className="tarjeta p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{c.nombre}</h1>
                <p className="mt-1 text-xl text-gris">{c.proposito}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-gris">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {c.alcaldia}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Regresa en {c.plazoDias} días</span>
                  {c.padronSedeco && <span className="flex items-center gap-1.5 text-impulso"><BadgeCheck className="h-4 w-4" /> Padrón SEDECO</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`chip ${e.clase}`}>{e.texto}</span>
                <BotonCompartir />
              </div>
            </div>

            <div className="mt-6">
              <Progreso juntado={c.calculo.juntadoBarrio} metaBarrio={c.calculo.metaBarrio} sedeco={c.sedeco.monto} sedecoDesbloqueado={c.sedeco.desbloqueado} grande />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-barrio-suave p-4">
                <p className="font-bold text-barrio-oscuro">Tramo 1 · La gente del barrio (80%)</p>
                <p className="text-gris">
                  {c.calculo.faltaBarrio > 0 ? <>Faltan <b className="text-tinta">{pesos(c.calculo.faltaBarrio)}</b></> : <b className="text-impulso">¡Meta juntada!</b>}
                  {c.estado === "juntando" && <> · {diasRestantes(c.juntarHasta)} días para entrarle</>}
                </p>
              </div>
              <div className={`rounded-2xl border-2 p-4 transition ${c.sedeco.desbloqueado ? "border-impulso bg-impulso-suave" : "border-[#EDE6DC]"}`}>
                <p className={`flex items-center gap-1.5 font-bold ${c.sedeco.desbloqueado ? "text-impulso-oscuro" : "text-gris"}`}>
                  {c.sedeco.desbloqueado ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  Tramo 2 · Impulso SEDECO (20%, 0% interés)
                </p>
                <p className="text-gris">
                  {c.sedeco.desbloqueado ? <>Se encendió con <b className="text-impulso-oscuro">{pesos(c.sedeco.monto)}</b> (simulado en demo)</> : "Se enciende solito cuando el barrio llega al 80%."}
                </p>
              </div>
            </div>

            {c.estado !== "juntando" && c.estado !== "vencida" && (
              <Link href={`/coperacha/${c.id}/pagar`} className="boton-impulso mt-5 w-full">
                <Banknote className="h-6 w-6" /> Ver lo que le toca a cada quien y regresar el dinero <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </section>

          <section className="tarjeta p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-extrabold"><Users className="h-6 w-6 text-barrio" /> Ya le entraron</h2>
              <span className="flex items-center gap-1.5 text-sm text-gris">
                <span className="h-2 w-2 animate-pulse rounded-full bg-impulso" /> En vivo
              </span>
            </div>
            {visibles.length === 0 ? (
              <p className="rounded-xl bg-crema p-6 text-center text-lg text-gris">Todavía nadie. ¡Sé la primera persona en entrarle!</p>
            ) : (
              <ul className="divide-y divide-[#F0EBE3]">
                {visibles.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-barrio-suave text-lg font-extrabold text-barrio-oscuro">
                        {a.nombre.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-bold">
                          {a.nombre} <span className="text-barrio-oscuro">{pesos(a.monto)}</span>
                        </p>
                        <p className="text-sm text-gris">
                          {a.ganancia === "efectivo4" ? "+4% en efectivo" : "+8% para gastar en el negocio"} · {horaCorta(a.confirmadaEn || a.creadaEn)}
                          {a.modoDemo && <> · cobrado {pesos(a.montoCobrado, true)}</>}
                        </p>
                        {a.excedente > 0 && a.estado === "confirmada" && <p className="text-sm text-barrio-oscuro">Sobraron {pesos(a.excedente)}: se le regresan</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Insignia estado={a.estado} simulado={a.simulado} modoDemo={a.modoDemo} />
                      {a.estado === "pendiente" && <BotonSimular aportacionId={a.id} alTerminar={cargar} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm text-gris">Cero capturas de pantalla: cada pago lo confirma Banxico a través de pey y aparece aquí solito.</p>
          </section>
        </div>

        {/* Tarjeta lateral */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TarjetaEntrarle datos={datos} alTerminar={cargar} />
        </aside>
      </div>
    </div>
  );
}

function TarjetaEntrarle({ datos, alTerminar }: { datos: Respuesta; alTerminar: () => void }) {
  const c = datos.coperacha;
  const [monto, setMonto] = useState(200);
  const [otro, setOtro] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [clabeSel, setClabeSel] = useState<string>(CLABES_EVENTO[0].clabe);
  const [otraClabe, setOtraClabe] = useState("");
  const [ganancia, setGanancia] = useState<"efectivo4" | "tienda8">("efectivo4");
  const [metodo, setMetodo] = useState<"pn" | "qr">("pn");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [cobro, setCobro] = useState<Cobro | null>(null);

  const montoFinal = otro ? Number(otro) : monto;
  const clabe = clabeSel === "otra" ? otraClabe.replace(/\D/g, "") : clabeSel;
  const ganas = montoFinal * (ganancia === "efectivo4" ? 0.04 : 0.08);
  const miAportacion = cobro ? c.aportaciones.find((a) => a.id === cobro.id) : undefined;

  if (c.estado !== "juntando") {
    const vencida = c.estado === "vencida";
    return (
      <div className="tarjeta p-6 text-center">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${vencida ? "bg-[#EFEAE3] text-gris" : "bg-impulso-suave text-impulso"}`}>
          {vencida ? <Clock className="h-8 w-8" /> : <PartyPopper className="h-8 w-8" />}
        </span>
        <p className="mt-4 text-2xl font-extrabold">{vencida ? "Se acabó el tiempo" : "¡Meta juntada!"}</p>
        <p className="mt-2 text-gris">
          {vencida
            ? "Esta coperacha ya no recibe aportaciones. Si alguien paga tarde, se le regresa completo."
            : "Ya no se aceptan más aportaciones. Si alguien paga tarde, su dinero queda marcado para regresárselo."}
        </p>
        {!vencida && (
          <Link href={`/coperacha/${c.id}/pagar`} className="boton-impulso mt-5 w-full">
            Ver lo que le toca a cada quien
          </Link>
        )}
      </div>
    );
  }

  async function entrarle() {
    setEnviando(true);
    setError("");
    try {
      const r = await fetch("/api/pey/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coperachaId: c.id, nombre, celular, clabeRetorno: clabe, monto: montoFinal, ganancia, metodo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCobro({ ...d.aportacion, mensaje: d.mensaje, aviso: d.aviso });
      alTerminar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setEnviando(false);
    }
  }

  // Después de pedir el cobro
  if (cobro) {
    const listo = miAportacion && miAportacion.estado !== "pendiente";
    return (
      <div className="tarjeta p-6">
        {listo ? (
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-impulso-suave text-impulso"><Check className="h-9 w-9" /></span>
            <p className="mt-3 text-2xl font-extrabold">¡Gracias, {nombre.split(" ")[0]}!</p>
            <p className="mt-1 text-gris">Tu aportación de {pesos(cobro.monto)} ya cuenta para el barrio.</p>
            <div className="mt-3 flex justify-center"><Insignia estado={miAportacion.estado} simulado={miAportacion.simulado} modoDemo={miAportacion.modoDemo} /></div>
          </div>
        ) : (
          <>
            <p className="text-xl font-extrabold">{cobro.metodo === "qr" ? "Escanea con tu app del banco" : "Revisa tu celular"}</p>
            <p className="mt-1 text-gris">{cobro.mensaje}</p>
            {cobro.qrString && (
              <div className="mt-4 flex justify-center"><QrCoDi valor={cobro.qrString} /></div>
            )}
            {cobro.metodo === "pn" && cobro.enviadoAPey && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-crema p-4">
                <Smartphone className="h-8 w-8 text-barrio" />
                <p>Abre la notificación CoDi de tu banco y toca <b>Autorizar</b>. Tienes 6 minutos.</p>
              </div>
            )}
            <div className="mt-4 flex items-center justify-center gap-2 text-gris">
              <Loader2 className="h-5 w-5 animate-spin" /> Esperando confirmación de Banxico…
            </div>
            {cobro.montoCobrado !== cobro.monto && (
              <p className="mt-3 rounded-xl bg-barrio-suave p-3 text-sm text-barrio-oscuro">
                <FlaskConical className="mr-1 inline h-4 w-4" /> Modo Demo: tu aportación cuenta como {pesos(cobro.monto)}, pero el cobro real es de {pesos(cobro.montoCobrado, true)}.
              </p>
            )}
            {cobro.aviso && <p className="mt-3 flex gap-2 rounded-xl bg-[#FFF6E0] p-3 text-sm text-[#8A5A00]"><AlertTriangle className="h-4 w-4 shrink-0" /> {cobro.aviso}</p>}
            <div className="mt-4 flex justify-center"><BotonSimular aportacionId={cobro.id} alTerminar={alTerminar} /></div>
          </>
        )}
        <button className="boton-suave mt-5 w-full" onClick={() => { setCobro(null); setOtro(""); }}>
          Hacer otra aportación
        </button>
      </div>
    );
  }

  return (
    <div className="tarjeta p-6">
      <p className="text-2xl font-extrabold">Entrarle a esta coperacha</p>
      <p className="text-gris">Pon lo que puedas. Faltan {pesos(c.calculo.faltaBarrio)}.</p>

      <div className="mt-4">
        <p className="etiqueta">¿Cuánto quieres poner?</p>
        <div className="grid grid-cols-3 gap-2">
          {[100, 200, 500].map((m) => (
            <button key={m} type="button" onClick={() => { setMonto(m); setOtro(""); }}
              className={`rounded-xl border-2 py-3 text-lg font-extrabold ${!otro && monto === m ? "border-barrio bg-barrio-suave text-barrio-oscuro" : "border-[#EDE6DC] bg-white"}`}>
              {pesos(m)}
            </button>
          ))}
        </div>
        <input className="campo mt-2" type="number" min={10} placeholder="Otro monto" value={otro} onChange={(e) => setOtro(e.target.value)} />
        {datos.modoDemo && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-barrio-oscuro">
            <FlaskConical className="h-4 w-4" /> Modo Demo: se cobra $0.01 de verdad, cuenta como {pesos(montoFinal || 0)}.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="etiqueta">Tu nombre</label>
          <input className="campo" placeholder="Ej. Don Chuy" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta">Tu celular {metodo === "qr" && <span className="font-normal text-gris">(opcional)</span>}</label>
          <input className="campo" inputMode="numeric" maxLength={10} placeholder="10 dígitos · ahí te llega la solicitud CoDi" value={celular} onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div>
          <label className="etiqueta">Tu CLABE para recibir tu dinero de vuelta</label>
          <select className="campo" value={clabeSel} onChange={(e) => setClabeSel(e.target.value)}>
            {CLABES_EVENTO.map((x) => (
              <option key={x.clabe} value={x.clabe}>{x.nombre} · •••• {x.clabe.slice(-4)}</option>
            ))}
            <option value="otra">Otra CLABE…</option>
          </select>
          {clabeSel === "otra" && <input className="campo mt-2" inputMode="numeric" maxLength={18} placeholder="18 dígitos" value={otraClabe} onChange={(e) => setOtraClabe(e.target.value)} />}
        </div>
      </div>

      <div className="mt-4">
        <p className="etiqueta">¿Cómo quieres tu ganancia?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setGanancia("efectivo4")}
            className={`rounded-2xl border-2 p-4 text-left transition ${ganancia === "efectivo4" ? "border-barrio bg-barrio-suave" : "border-[#EDE6DC] bg-white"}`}>
            <Banknote className="h-7 w-7 text-barrio" />
            <p className="mt-1 text-2xl font-extrabold">+4%</p>
            <p className="text-sm font-semibold">en efectivo directo a tu banco</p>
          </button>
          <button type="button" onClick={() => setGanancia("tienda8")}
            className={`rounded-2xl border-2 p-4 text-left transition ${ganancia === "tienda8" ? "border-impulso bg-impulso-suave" : "border-[#EDE6DC] bg-white"}`}>
            <ShoppingBag className="h-7 w-7 text-impulso" />
            <p className="mt-1 text-2xl font-extrabold">+8%</p>
            <p className="text-sm font-semibold">para gastar en el negocio</p>
          </button>
        </div>
        {montoFinal > 0 && (
          <p className="mt-2 text-center text-gris">
            Lo que te toca recibir: <b className="text-tinta">{pesos(montoFinal + ganas)}</b> {ganancia === "tienda8" ? "en saldo" : "a tu banco"}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
        <button type="button" onClick={() => setMetodo("pn")} className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 ${metodo === "pn" ? "border-tinta" : "border-[#EDE6DC] text-gris"}`}>
          <Smartphone className="h-4 w-4" /> A mi celular
        </button>
        <button type="button" onClick={() => setMetodo("qr")} className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 ${metodo === "qr" ? "border-tinta" : "border-[#EDE6DC] text-gris"}`}>
          <QrCode className="h-4 w-4" /> Código QR
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 font-semibold text-red-700">{error}</p>}

      <button className="boton-barrio mt-5 w-full" disabled={enviando || !nombre || !montoFinal || (metodo === "pn" && celular.length !== 10)} onClick={entrarle}>
        {enviando ? <Loader2 className="h-6 w-6 animate-spin" /> : <HandHeart className="h-6 w-6" />}
        Entrarle con {pesos(montoFinal || 0)}
      </button>
      <p className="mt-3 text-center text-sm text-gris">Pagas desde tu app del banco con CoDi. Coperacha nunca guarda tu dinero.</p>
    </div>
  );
}

export function BotonSimular({ aportacionId, regresoId, alTerminar, texto }: { aportacionId?: string; regresoId?: string; alTerminar: () => void; texto?: string }) {
  const [cargando, setCargando] = useState(false);
  return (
    <button
      type="button"
      disabled={cargando}
      title="Solo para pruebas en vivo: marca el pago como confirmado sin mover dinero. Se verá como “Simulación”."
      className="flex items-center gap-1 rounded-lg border border-dashed border-[#C9C0B4] px-2 py-1 text-xs font-semibold text-gris hover:border-gris hover:text-tinta"
      onClick={async () => {
        setCargando(true);
        await fetch("/api/pey/simular", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aportacionId, regresoId }) });
        setCargando(false);
        alTerminar();
      }}
    >
      {cargando ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
      {texto || "Simular pago CoDi confirmado"}
    </button>
  );
}

function BotonCompartir() {
  const [copiado, setCopiado] = useState(false);
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  useEffect(() => setPuedeCompartir(typeof navigator !== "undefined" && "share" in navigator), []);
  return (
    <button
      type="button"
      className="chip border-2 border-[#EDE6DC] bg-white hover:border-barrio"
      onClick={async () => {
        const url = window.location.href;
        if (puedeCompartir) {
          await navigator.share({ title: "Entrarle a la coperacha", url }).catch(() => undefined);
        } else {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }
      }}
    >
      {copiado ? <Check className="h-4 w-4" /> : puedeCompartir ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? "¡Copiado!" : "Compartir"}
    </button>
  );
}

function Confeti() {
  const colores = ["#EA580C", "#059669", "#FBBF24", "#F97316", "#10B981"];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center">
      <div className="relative w-full max-w-3xl">
        {Array.from({ length: 36 }).map((_, i) => (
          <span key={i} className="absolute h-3 w-2 animate-caer rounded-sm"
            style={{ left: `${(i * 37) % 100}%`, background: colores[i % colores.length], animationDelay: `${(i % 9) * 0.12}s` }} />
        ))}
        <div className="tarjeta mx-auto mt-6 flex w-fit items-center gap-3 border-impulso bg-impulso px-6 py-4 text-white shadow-xl">
          <PartyPopper className="h-8 w-8" />
          <p className="text-xl font-extrabold">¡El barrio llegó al 80%! Se encendió el Impulso SEDECO</p>
        </div>
      </div>
    </div>
  );
}
