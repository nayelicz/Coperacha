"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle, ArrowLeft, Award, Banknote, Check, Download, FlaskConical, Hourglass, Landmark, Loader2, RotateCcw,
  ShieldCheck, ShoppingBag, Smartphone, Sparkles, Ticket,
} from "lucide-react";
import BotonSimular from "./BotonSimular";
import BotonCompartir from "./BotonCompartir";
import { Aviso, Avatar, Cargando, Hoja, MontoGrande } from "./ui";
import { fechaCorta, pesos } from "@/lib/formato";
import { api, mensajeDe, useCoperacha } from "@/lib/cliente";
import type { CoperachaPublica } from "@/lib/logica";

const ESTADO_REGRESO: Record<string, { texto: string; clase: string; icono: typeof Check }> = {
  por_pedir: { texto: "Por pedir", clase: "bg-carbon/[0.07] text-ceniza", icono: Hourglass },
  solicitado: { texto: "Solicitud CoDi enviada", clase: "bg-[#FFF1B8] text-[#6E4E00]", icono: Smartphone },
  pagado: { texto: "Pagado · CoDi / Banxico", clase: "bg-carbon text-impulso", icono: ShieldCheck },
  simulado: { texto: "Simulación · no es pago real", clase: "border border-dashed border-ceniza/60 bg-white/50 text-ceniza", icono: FlaskConical },
  bono_emitido: { texto: "Bono listo para gastar", clase: "bg-impulso text-carbon", icono: Ticket },
  requiere_cuenta: { texto: "Falta registrar la CLABE", clase: "bg-[#FFF1B8] text-[#6E4E00]", icono: AlertTriangle },
  error: { texto: "Error", clase: "bg-red-100 text-red-800", icono: AlertTriangle },
};

export default function PagarYCertificado({ id }: { id: string }) {
  const { datos, noExiste, cargar } = useCoperacha(id);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [celular, setCelular] = useState("");

  if (noExiste)
    return (
      <Hoja className="mx-auto mt-10 max-w-lg text-center">
        <p className="py-4 text-2xl font-bold">No encontramos esta coperacha</p>
        <Link href="/" className="boton-carbon">Ir al inicio</Link>
      </Hoja>
    );
  if (!datos) return <Cargando />;
  const c = datos.coperacha;

  if (c.estado === "juntando" || c.estado === "vencida") {
    return (
      <Hoja className="mx-auto mt-10 max-w-xl text-center">
        <p className="pt-4 text-2xl font-bold">{c.estado === "vencida" ? "Esta coperacha venció" : "Todavía se está juntando"}</p>
        <p className="mt-2 text-ceniza">El regreso del dinero se activa cuando el barrio junta su 80%.</p>
        <Link href={`/coperacha/${c.id}`} className="boton-carbon mt-6">Ver la coperacha</Link>
      </Hoja>
    );
  }

  const plan = c.regresos.length
    ? c.regresos
    : c.calculo.porRegresar.map((r, i) => ({ ...r, id: "plan" + i, estado: "por_pedir", simulado: false, montoCobrado: 0, bonoCodigo: undefined, actualizadoEn: "" }));
  const sumaEfectivo = plan.filter((r) => r.tipo !== "sedeco" && !(r.tipo === "aportacion" && esTienda(c, r.aportacionId))).reduce((s, r) => s + r.monto, 0);
  const sumaBonos = plan.filter((r) => r.tipo === "aportacion" && esTienda(c, r.aportacionId)).reduce((s, r) => s + r.monto, 0);
  const sedeco = plan.find((r) => r.tipo === "sedeco");
  const porAtender = c.regresos.filter((r) => ["por_pedir", "requiere_cuenta", "error"].includes(r.estado)).length;

  async function regresar() {
    setEnviando(true);
    setError("");
    try {
      if (!c.tieneCelularNegocio && celular) await api(`/api/coperachas/${c.id}`, { celularNegocio: celular }, "PATCH");
      await api("/api/pey/regresar", { coperachaId: c.id });
      cargar();
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/coperacha/${c.id}`} className="no-imprimir mb-3 mt-2 grid h-10 w-10 place-items-center rounded-full bg-capa2 text-white hover:bg-[#2a2a2e]" aria-label="Volver a la coperacha">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      {c.certificado ? (
        <Certificado c={c} />
      ) : (
        <div className="space-y-6">
          <section className="animate-subir">
            <p className="text-[15px] text-humo">{c.nombre} · regresa antes del {fechaCorta(c.regresarEl)}</p>
            <MontoGrande valor={sumaEfectivo + (sedeco?.monto || 0)} className="mt-1 text-[52px] leading-none" />
            <p className="mt-1 text-[15px] text-humo">
              por regresar con CoDi · juntó {pesos(c.calculo.juntadoBarrio)} del barrio + {pesos(c.sedeco.monto)} de SEDECO
            </p>
          </section>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Resumen icono={Banknote} titulo="Efectivo a la gente" valor={pesos(sumaEfectivo, true)} fondo="bg-sol" />
            <Resumen icono={ShoppingBag} titulo="Saldo en tu negocio" valor={pesos(sumaBonos, true)} fondo="bg-impulso" />
            <Resumen icono={Landmark} titulo="SEDECO · 0% interés" valor={pesos(sedeco?.monto || 0)} fondo="bg-cielo" />
            <Resumen icono={Sparkles} titulo="Tarifa Coperacha 1%" valor={pesos(c.tarifa.monto)} nota={textoTarifa(c.tarifa.estado)} fondo="bg-capa2 text-white" />
          </div>

          <Hoja>
            <h2 className="text-xl font-bold">Lo que le toca a cada quien</h2>
            <ul className="mt-1 divide-y divide-carbon/[0.06]">
              {plan.map((r) => {
                const est = ESTADO_REGRESO[r.estado] || ESTADO_REGRESO.por_pedir;
                const Icono = r.tipo === "sedeco" ? Landmark : r.tipo === "excedente" ? RotateCcw : esTienda(c, r.aportacionId) ? ShoppingBag : Banknote;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                    {r.tipo === "sedeco" ? (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cielo"><Landmark className="h-5 w-5" /></span>
                    ) : (
                      <Avatar nombre={r.paraQuien} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-semibold"><Icono className="h-4 w-4 text-ceniza" /> {r.paraQuien}</p>
                      <p className="text-[13px] text-ceniza">
                        {r.nota}
                        {r.clabe && <> · CLABE {r.clabe}</>}
                        {r.bonoCodigo && <> · Código <b className="text-carbon">{r.bonoCodigo}</b></>}
                        {datos.modoDemo && r.montoCobrado > 0 && r.montoCobrado !== r.monto && <> · en demo se pide {pesos(r.montoCobrado, true)}</>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="cifras font-semibold">{pesos(r.monto, true)}</span>
                      {c.regresos.length > 0 && <span className={`chip py-0.5 text-xs ${est.clase}`}><est.icono className="h-3.5 w-3.5" /> {est.texto}</span>}
                      {c.regresos.length > 0 && datos.modoDemo && ["por_pedir", "solicitado", "requiere_cuenta", "error"].includes(r.estado) && (
                        <BotonSimular regresoId={r.id} alTerminar={cargar} texto="Simular que el negocio pagó" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 space-y-3">
              {c.regresos.some((r) => r.estado === "requiere_cuenta") && (
                <Aviso>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Para que el dinero llegue directo, cada CLABE debe estar registrada y ACTIVE en pey (tarda hasta 5 días hábiles). Regístralas en{" "}
                    <Link href="/cuentas" className="underline">Cuentas</Link>. Coperacha nunca manda el regreso a su propia cuenta.
                  </span>
                </Aviso>
              )}

              {!c.tieneCelularNegocio && (
                <div>
                  <label className="etiqueta" htmlFor="cel">Celular del negocio (ahí te llegan las solicitudes CoDi)</label>
                  <input id="cel" className="campo cifras" inputMode="numeric" maxLength={10} placeholder="10 dígitos" value={celular}
                    onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))} />
                </div>
              )}

              {error && <Aviso tipo="error">{error}</Aviso>}
            </div>

            {(c.regresos.length === 0 || porAtender > 0) && (
              <button className="boton-carbon mt-5 w-full py-4 text-lg" disabled={enviando} onClick={regresar}>
                {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Banknote className="h-5 w-5" />}
                {c.regresos.length === 0 ? "Regresar dinero con CoDi" : "Volver a mandar los pendientes"}
              </button>
            )}
            <p className="mt-3 text-center text-[13px] text-ceniza">
              Te llega una solicitud CoDi por persona a tu celular. Al autorizarla, el dinero va directo de tu cuenta a la suya: Coperacha no lo toca.
            </p>
          </Hoja>
        </div>
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

function Resumen({ icono: I, titulo, valor, nota, fondo }: { icono: typeof Check; titulo: string; valor: string; nota?: string; fondo: string }) {
  return (
    <div className={`rounded-[22px] p-4 ${fondo} ${fondo.includes("text-") ? "" : "text-carbon"}`}>
      <I className="h-5 w-5 opacity-80" />
      <p className="mt-3 text-[13px] font-semibold opacity-75">{titulo}</p>
      <p className="cifras text-xl font-bold">{valor}</p>
      {nota && <p className="text-xs opacity-70">{nota}</p>}
    </div>
  );
}

function Certificado({ c }: { c: CoperachaPublica }) {
  const cert = c.certificado!;
  const simulados = c.regresos.filter((r) => r.estado === "simulado").length;
  const texto = `${c.nombre} regresó completa su coperacha de ${pesos(c.montoMeta)}. Certificado de Buen Pagador ${cert.folio}, verificado con CoDi.`;

  return (
    <div className="animate-aparecer">
      <div className="relative overflow-hidden rounded-[32px] bg-impulso p-8 text-center text-carbon sm:p-12">
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/25" aria-hidden />
        <div className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-sol/60" aria-hidden />
        <div className="relative">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-carbon text-impulso"><Award className="h-10 w-10" /></span>
          <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.2em] opacity-70">Coperacha · CDMX</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Certificado de Buen Pagador</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 font-semibold"><ShieldCheck className="h-5 w-5" /> Verificado con CoDi</p>
          <p className="mt-6 opacity-70">Se otorga a</p>
          <p className="text-3xl font-bold">{c.nombre}</p>
          <p className="mx-auto mt-3 max-w-lg text-lg">
            por regresar completa su coperacha de <b>{pesos(c.montoMeta)}</b> a {c.calculo.personas} {c.calculo.personas === 1 ? "persona" : "personas"} de su barrio y al Impulso SEDECO.
          </p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/40 p-3">
              <p className="text-sm opacity-70">Folio</p>
              <p className="font-mono text-lg font-bold">{cert.folio}</p>
            </div>
            <div className="rounded-2xl bg-white/40 p-3">
              <p className="text-sm opacity-70">Fecha</p>
              <p className="text-lg font-bold">{fechaCorta(cert.emitidoEn)}</p>
            </div>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-carbon px-5 py-2.5 font-semibold text-white">
            <Sparkles className="h-5 w-5 text-impulso" /> Tu próxima coperacha puede ser de hasta {pesos(cert.nivelDesbloqueado)}
          </p>
          {simulados > 0 && (
            <p className="mt-4 text-sm opacity-75">
              <FlaskConical className="mr-1 inline h-4 w-4" /> Certificado de prueba: {simulados} {simulados === 1 ? "pago fue simulado" : "pagos fueron simulados"}.
            </p>
          )}
        </div>
      </div>
      <div className="no-imprimir mt-4 grid gap-2 sm:grid-cols-3">
        <button className="boton-claro" onClick={() => window.print()}><Download className="h-5 w-5" /> Descargar (PDF)</button>
        <BotonCompartir titulo="Certificado de Buen Pagador" texto={texto} className="boton-oscuro" />
        <Link href="/armar" className="boton-barrio">Armar otra coperacha</Link>
      </div>
    </div>
  );
}
