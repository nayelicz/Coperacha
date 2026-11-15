"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Banknote, Clock, MapPin, PartyPopper } from "lucide-react";
import Progreso from "./Progreso";
import Insignia, { puntoDe } from "./Insignia";
import Entrarle from "./Entrarle";
import BotonSimular from "./BotonSimular";
import BotonCompartir from "./BotonCompartir";
import { ETIQUETA_ESTADO } from "./TarjetaCoperacha";
import { Avatar, Cargando, Hoja, MontoGrande } from "./ui";
import { diasRestantes, horaCorta, pesos } from "@/lib/formato";
import { useCoperacha } from "@/lib/cliente";

export default function DetalleEnVivo({ id }: { id: string }) {
  const { datos, noExiste, cargar, recienEncendido } = useCoperacha(id);

  if (noExiste)
    return (
      <Hoja className="mx-auto mt-10 max-w-lg text-center">
        <p className="py-4 text-2xl font-bold">No encontramos esta coperacha</p>
        <Link href="/" className="boton-carbon">Ir al inicio</Link>
      </Hoja>
    );
  if (!datos) return <Cargando />;

  const c = datos.coperacha;
  const e = ETIQUETA_ESTADO[c.estado];
  const visibles = c.aportaciones.slice().reverse();
  const yaRegresa = c.estado !== "juntando" && c.estado !== "vencida";

  return (
    <div>
      {recienEncendido && <Celebracion />}

      <div className="mb-2 flex items-center justify-between pt-2">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full bg-capa2 text-white transition hover:bg-[#2a2a2e]" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <BotonCompartir />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        {/* Encabezado oscuro + tramos */}
        <section className="animate-subir space-y-5 pt-2">
          <div>
            <span className={`chip ${e.claseOscura}`}>{e.texto}</span>
            <h1 className="mt-3 text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[40px]">{c.nombre}</h1>
            <p className="mt-1 text-lg text-humo">{c.proposito}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-humo">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {c.alcaldia}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Regresa en {c.plazoDias} días</span>
              {c.padronSedeco && <span className="flex items-center gap-1.5 text-impulso"><BadgeCheck className="h-4 w-4" /> Padrón SEDECO</span>}
            </p>
          </div>

          <div>
            <p className="text-[15px] text-humo">Juntado por el barrio</p>
            <MontoGrande valor={c.calculo.juntadoBarrio} className="text-[52px] leading-none" />
          </div>

          <Progreso juntado={c.calculo.juntadoBarrio} metaBarrio={c.calculo.metaBarrio} sedeco={c.sedeco.monto} sedecoDesbloqueado={c.sedeco.desbloqueado} grande />

          <p className="text-[15px] text-humo">
            {c.sedeco.desbloqueado
              ? <>¡Meta del barrio juntada! Se encendió el <b className="text-impulso">Impulso SEDECO</b> de {pesos(c.sedeco.monto)} (simulado), sin intereses.</>
              : <>Faltan <b className="cifras text-white">{pesos(c.calculo.faltaBarrio)}</b>{c.estado === "juntando" && <> · {diasRestantes(c.juntarHasta)} días</>}. Al 80% se enciende el <b className="text-impulso">Impulso SEDECO</b>.</>}
          </p>

          {yaRegresa && (
            <Link href={`/coperacha/${c.id}/pagar`} className="boton-impulso w-full">
              <Banknote className="h-5 w-5" /> Regresar el dinero a cada quien <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </section>

        {/* Entrarle (en celular va justo después del encabezado) */}
        <aside className="lg:sticky lg:top-20 lg:row-span-2">
          <Entrarle datos={datos} alTerminar={cargar} />
        </aside>

        {/* Lista en vivo */}
        <Hoja>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-xl font-bold">Ya le entraron <span className="text-ceniza">· {c.calculo.personas}</span></h2>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-ceniza">
              <span className="h-2 w-2 animate-pulse rounded-full bg-impulso" /> En vivo
            </span>
          </div>
          {visibles.length === 0 ? (
            <p className="py-8 text-center text-lg text-ceniza">Todavía nadie. ¡Sé la primera persona en entrarle!</p>
          ) : (
            <ul className="divide-y divide-carbon/[0.06]">
              {visibles.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <Avatar nombre={a.nombre} punto={puntoDe(a.estado, a.simulado)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.nombre}</p>
                    <p className="text-[13px] text-ceniza">
                      {a.ganancia === "efectivo4" ? "+4% efectivo" : "+8% en el negocio"} · {horaCorta(a.confirmadaEn || a.creadaEn)}
                      {a.modoDemo && <> · cobrado {pesos(a.montoCobrado, true)}</>}
                    </p>
                    {a.excedente > 0 && a.estado === "confirmada" && <p className="text-[13px] text-barrio-oscuro">Sobraron {pesos(a.excedente)}: se le regresan</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="cifras font-semibold">+{pesos(a.monto)}</span>
                    <Insignia estado={a.estado} simulado={a.simulado} modoDemo={a.modoDemo} corta />
                    {a.estado === "pendiente" && datos.modoDemo && <BotonSimular aportacionId={a.id} alTerminar={cargar} texto="Simular" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[13px] text-ceniza">Cero capturas de pantalla: cada pago lo confirma Banxico a través de pey y aparece aquí solito.</p>
        </Hoja>
      </div>
    </div>
  );
}

function Celebracion() {
  const colores = ["#FF8A3D", "#A6F04A", "#F6E43A", "#8CBFFF", "#FAEDE6"];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      <div className="relative w-full max-w-3xl">
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="absolute h-3 w-2 animate-caer rounded-sm"
            style={{ left: `${(i * 37) % 100}%`, background: colores[i % colores.length], animationDelay: `${(i % 9) * 0.12}s` }} />
        ))}
        <div className="mx-auto mt-6 flex w-fit animate-aparecer items-center gap-3 rounded-full bg-impulso px-6 py-3.5 text-carbon shadow-2xl shadow-black/50">
          <PartyPopper className="h-6 w-6" />
          <p className="text-[17px] font-bold">¡El barrio llegó al 80%! Se encendió el Impulso SEDECO</p>
        </div>
      </div>
    </div>
  );
}
