"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Award, Banknote, Check, Download, FlaskConical, Hourglass, Landmark, Loader2, Receipt, RotateCcw,
  Share2, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Ticket,
} from "lucide-react";
import Pasos from "./Pasos";
import { BotonSimular } from "./DetalleEnVivo";
import { fechaCorta, pesos } from "@/lib/formato";
import type { CoperachaPublica } from "@/lib/logica";

type Respuesta = { coperacha: CoperachaPublica; modoDemo: boolean; certificados: number };

const ESTADO_REGRESO: Record<string, { texto: string; clase: string; icono: typeof Check }> = {
  por_pedir: { texto: "Por pedir", clase: "bg-[#F3EEE7] text-gris", icono: Hourglass },
  solicitado: { texto: "Solicitud CoDi enviada al negocio", clase: "bg-[#FFF6E0] text-[#8A5A00]", icono: Smartphone },
  pagado: { texto: "Pagado · confirmado con CoDi / Banxico", clase: "bg-impulso-suave text-impulso-oscuro", icono: ShieldCheck },
  simulado: { texto: "Simulación · no es pago real", clase: "border border-dashed border-[#B5ADA2] bg-[#F3EEE7] text-gris", icono: FlaskConical },
  bono_emitido: { texto: "Bono listo para gastar", clase: "bg-impulso-suave text-impulso-oscuro", icono: Ticket },
  requiere_cuenta: { texto: "Falta registrar la CLABE en pey", clase: "bg-[#FFF6E0] text-[#8A5A00]", icono: AlertTriangle },
  error: { texto: "Error", clase: "bg-red-50 text-red-700", icono: AlertTriangle },
};

export default function PagarYCertificado({ id }: { id: string }) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [celular, setCelular] = useState("");

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/coperachas/${id}`, { cache: "no-store" });
    if (r.ok) setDatos(await r.json());
  }, [id]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 3000);
    return () => clearInterval(t);
  }, [cargar]);

  if (!datos) return <div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-barrio" /></div>;
  const c = datos.coperacha;

  if (c.estado === "juntando" || c.estado === "vencida") {
    return (
      <div className="tarjeta mx-auto max-w-xl p-8 text-center">
        <p className="text-2xl font-extrabold">{c.estado === "vencida" ? "Esta coperacha venció" : "Todavía se está juntando"}</p>
        <p className="mt-2 text-gris">El regreso del dinero se activa cuando el barrio junta su 80%.</p>
        <Link href={`/coperacha/${c.id}`} className="boton-barrio mt-6">Ver la coperacha</Link>
      </div>
    );
  }

  const plan = c.regresos.length ? c.regresos : c.calculo.porRegresar.map((r, i) => ({ ...r, id: "plan" + i, estado: "por_pedir", simulado: false, montoCobrado: 0, bonoCodigo: undefined, actualizadoEn: "" }));
  const sumaEfectivo = plan.filter((r) => r.tipo !== "sedeco" && !(r.tipo === "aportacion" && esTienda(c, r.aportacionId))).reduce((s, r) => s + r.monto, 0);
  const sumaBonos = plan.filter((r) => r.tipo === "aportacion" && esTienda(c, r.aportacionId)).reduce((s, r) => s + r.monto, 0);
  const sedeco = plan.find((r) => r.tipo === "sedeco");
  const porAtender = c.regresos.filter((r) => ["por_pedir", "requiere_cuenta", "error"].includes(r.estado)).length;

  async function regresar() {
    setEnviando(true);
    setError("");
    try {
      if (!c.tieneCelularNegocio && celular) {
        const p = await fetch(`/api/coperachas/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ celularNegocio: celular }) });
        if (!p.ok) throw new Error((await p.json()).error);
      }
      const r = await fetch("/api/pey/regresar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coperachaId: c.id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/coperacha/${c.id}`} className="no-imprimir mb-4 inline-flex items-center gap-1.5 font-semibold text-gris hover:text-tinta">
        <ArrowLeft className="h-4 w-4" /> Volver a la coperacha
      </Link>

      {c.certificado ? (
        <Certificado c={c} />
      ) : (
        <>
          <Pasos
            color="impulso"
            titulo="Regresa el dinero y gana tu Certificado de Buen Pagador"
            pasos={[
              { icono: Receipt, texto: "Revisa lo que le toca a cada quien" },
              { icono: Smartphone, texto: "Autoriza cada pago CoDi en tu banco" },
              { icono: Award, texto: "Recibe tu certificado y pide más" },
            ]}
          />

          <section className="tarjeta p-6">
            <h1 className="text-3xl font-extrabold">{c.nombre}</h1>
            <p className="text-gris">
              Juntó {pesos(c.calculo.juntadoBarrio)} del barrio + {pesos(c.sedeco.monto)} de Impulso SEDECO · Regresa antes del {fechaCorta(c.regresarEl)}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Resumen icono={Banknote} titulo="Efectivo a la gente" valor={pesos(sumaEfectivo, true)} color="barrio" />
              <Resumen icono={ShoppingBag} titulo="Saldo en tu negocio" valor={pesos(sumaBonos, true)} color="impulso" />
              <Resumen icono={Landmark} titulo="SEDECO (0% interés)" valor={pesos(sedeco?.monto || 0)} color="impulso" />
              <Resumen icono={Sparkles} titulo="Tarifa Coperacha 1%" valor={pesos(c.tarifa.monto)} nota={textoTarifa(c.tarifa.estado)} color="gris" />
            </div>

            <h2 className="mt-8 text-xl font-extrabold">Lo que te toca regresar a cada quien</h2>
            <ul className="mt-2 divide-y divide-[#F0EBE3]">
              {plan.map((r) => {
                const est = ESTADO_REGRESO[r.estado] || ESTADO_REGRESO.por_pedir;
                const Icono = r.tipo === "sedeco" ? Landmark : r.tipo === "excedente" ? RotateCcw : esTienda(c, r.aportacionId) ? ShoppingBag : Banknote;
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-11 w-11 place-items-center rounded-xl ${r.tipo === "sedeco" ? "bg-impulso-suave text-impulso" : "bg-barrio-suave text-barrio-oscuro"}`}>
                        <Icono className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold">{r.paraQuien} <span className="text-barrio-oscuro">{pesos(r.monto, true)}</span></p>
                        <p className="text-sm text-gris">
                          {r.nota}
                          {r.clabe && <> · CLABE {r.clabe}</>}
                          {r.bonoCodigo && <> · Código <b className="text-tinta">{r.bonoCodigo}</b></>}
                          {datos.modoDemo && r.montoCobrado > 0 && r.montoCobrado !== r.monto && <> · en demo se pide {pesos(r.montoCobrado, true)}</>}
                        </p>
                      </div>
                    </div>
                    {c.regresos.length > 0 && (
                      <div className="flex flex-col items-end gap-1">
                        <span className={`chip ${est.clase}`}><est.icono className="h-4 w-4" /> {est.texto}</span>
                        {["por_pedir", "solicitado", "requiere_cuenta", "error"].includes(r.estado) && (
                          <BotonSimular regresoId={r.id} alTerminar={cargar} texto="Simular que el negocio pagó" />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {c.regresos.some((r) => r.estado === "requiere_cuenta") && (
              <p className="mt-3 flex gap-2 rounded-xl bg-[#FFF6E0] p-3 text-sm text-[#8A5A00]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Para que el dinero llegue directo, cada CLABE debe estar registrada y ACTIVE en pey (tarda hasta 5 días hábiles). Regístralas en <Link href="/cuentas" className="underline">Cuentas</Link>. Coperacha nunca manda el regreso a su propia cuenta.
              </p>
            )}

            {!c.tieneCelularNegocio && (
              <div className="mt-5">
                <label className="etiqueta">Celular del negocio (ahí te llegan las solicitudes CoDi)</label>
                <input className="campo" inputMode="numeric" maxLength={10} placeholder="10 dígitos" value={celular} onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))} />
              </div>
            )}

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 font-semibold text-red-700">{error}</p>}

            {(c.regresos.length === 0 || porAtender > 0) && (
              <button className="boton-impulso mt-6 w-full text-xl" disabled={enviando} onClick={regresar}>
                {enviando ? <Loader2 className="h-6 w-6 animate-spin" /> : <Banknote className="h-6 w-6" />}
                {c.regresos.length === 0 ? "Regresar dinero con CoDi" : "Volver a mandar los pendientes"}
              </button>
            )}
            <p className="mt-3 text-center text-sm text-gris">
              Te llega una solicitud CoDi por persona a tu celular. Al autorizarla, el dinero va directo de tu cuenta a la suya: Coperacha no lo toca.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function esTienda(c: CoperachaPublica, aportacionId?: string) {
  return c.aportaciones.find((a) => a.id === aportacionId)?.ganancia === "tienda8";
}

function textoTarifa(e: string) {
  return { no_aplica: "Solo si se completa", solicitada: "Solicitud enviada", pagada: "Pagada", simulada: "Simulada", error: "Error al pedirla" }[e] || e;
}

function Resumen({ icono: I, titulo, valor, nota, color }: { icono: typeof Check; titulo: string; valor: string; nota?: string; color: "barrio" | "impulso" | "gris" }) {
  const cls = color === "barrio" ? "bg-barrio-suave text-barrio-oscuro" : color === "impulso" ? "bg-impulso-suave text-impulso-oscuro" : "bg-[#F3EEE7] text-gris";
  return (
    <div className={`rounded-2xl p-4 ${cls}`}>
      <I className="h-6 w-6" />
      <p className="mt-1 text-sm font-semibold">{titulo}</p>
      <p className="text-xl font-extrabold">{valor}</p>
      {nota && <p className="text-xs">{nota}</p>}
    </div>
  );
}

function Certificado({ c }: { c: CoperachaPublica }) {
  const cert = c.certificado!;
  const simulados = c.regresos.filter((r) => r.estado === "simulado").length;
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const texto = `${c.nombre} regresó completa su coperacha de ${pesos(c.montoMeta)}. Certificado de Buen Pagador ${cert.folio}, verificado con CoDi.`;
    if (typeof navigator.share === "function") await navigator.share({ title: "Certificado de Buen Pagador", text: texto, url: window.location.href }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(`${texto} ${window.location.href}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-[28px] border-[6px] border-impulso bg-white p-8 text-center shadow-xl sm:p-12">
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-impulso-suave" />
        <div className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-barrio-suave" />
        <div className="relative">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-impulso text-white"><Award className="h-11 w-11" /></span>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-impulso">Coperacha · CDMX</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Certificado de Buen Pagador</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 font-semibold text-impulso-oscuro"><ShieldCheck className="h-5 w-5" /> Verificado con CoDi</p>
          <p className="mt-6 text-lg text-gris">Se otorga a</p>
          <p className="text-3xl font-extrabold text-barrio-oscuro">{c.nombre}</p>
          <p className="mx-auto mt-3 max-w-lg text-lg">
            por regresar completa su coperacha de <b>{pesos(c.montoMeta)}</b> a {c.calculo.personas} {c.calculo.personas === 1 ? "persona" : "personas"} de su barrio y al Impulso SEDECO.
          </p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl bg-crema p-3">
              <p className="text-sm text-gris">Folio</p>
              <p className="font-mono text-lg font-bold">{cert.folio}</p>
            </div>
            <div className="rounded-2xl bg-crema p-3">
              <p className="text-sm text-gris">Fecha</p>
              <p className="text-lg font-bold">{fechaCorta(cert.emitidoEn)}</p>
            </div>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-impulso px-5 py-2 font-bold text-white">
            <Sparkles className="h-5 w-5" /> Tu próxima coperacha puede ser de hasta {pesos(cert.nivelDesbloqueado)}
          </p>
          {simulados > 0 && (
            <p className="mt-4 text-sm text-gris">
              <FlaskConical className="mr-1 inline h-4 w-4" /> Certificado de prueba: {simulados} {simulados === 1 ? "pago fue simulado" : "pagos fueron simulados"}.
            </p>
          )}
        </div>
      </div>
      <div className="no-imprimir mt-5 grid gap-3 sm:grid-cols-3">
        <button className="boton-impulso" onClick={() => window.print()}><Download className="h-5 w-5" /> Descargar (PDF)</button>
        <button className="boton-suave" onClick={compartir}>{copiado ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />} {copiado ? "¡Copiado!" : "Compartir"}</button>
        <Link href="/#armar" className="boton-barrio">Armar otra coperacha</Link>
      </div>
    </div>
  );
}
