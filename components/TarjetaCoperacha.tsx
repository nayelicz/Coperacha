import Link from "next/link";
import { ArrowUpRight, CalendarClock, MapPin, Users } from "lucide-react";
import Progreso from "./Progreso";
import { pesos, diasRestantes } from "@/lib/formato";
import type { CoperachaPublica } from "@/lib/logica";

export const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string; claseOscura: string }> = {
  juntando: { texto: "Juntando", clase: "bg-carbon/10 text-carbon", claseOscura: "bg-barrio/15 text-barrio" },
  completa: { texto: "Meta juntada", clase: "bg-carbon text-impulso", claseOscura: "bg-impulso/15 text-impulso" },
  regresando: { texto: "Regresando dinero", clase: "bg-carbon/10 text-carbon", claseOscura: "bg-impulso/15 text-impulso" },
  pagada: { texto: "Pagada · Buen pagador", clase: "bg-carbon text-impulso", claseOscura: "bg-impulso text-carbon" },
  vencida: { texto: "Se acabó el tiempo", clase: "bg-carbon/10 text-carbon/70", claseOscura: "bg-white/10 text-humo" },
};

// Colores de las "tarjetas digitales" del diseño.
const FONDOS = ["bg-sol", "bg-impulso", "bg-cielo", "bg-barrio"];
export const fondoTarjeta = (i: number) => FONDOS[i % FONDOS.length];

/** Una coperacha como tarjeta neón (tipo "Digital card"). */
export default function TarjetaCoperacha({ c, i = 0, className = "" }: { c: CoperachaPublica; i?: number; className?: string }) {
  const e = ETIQUETA_ESTADO[c.estado];
  const fondo = c.estado === "vencida" ? "bg-[#CFC9C2]" : fondoTarjeta(i);
  return (
    <Link
      href={`/coperacha/${c.id}`}
      className={`group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[26px] p-5 text-carbon transition hover:-translate-y-0.5 active:scale-[.99] ${fondo} ${className}`}
    >
      <span className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-white/20" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <p className="flex items-center gap-1 text-[13px] font-semibold opacity-70">
          <MapPin className="h-3.5 w-3.5" /> {c.alcaldia}
        </p>
        <span className={`chip shrink-0 py-0.5 text-xs ${e.clase}`}>{e.texto}</span>
      </div>

      <div className="relative">
        <h3 className="text-[22px] font-bold leading-tight tracking-tight">{c.nombre}</h3>
        <p className="line-clamp-1 text-[15px] opacity-70">{c.proposito}</p>
      </div>

      <div className="relative space-y-2.5">
        <Progreso juntado={c.calculo.juntadoBarrio} metaBarrio={c.calculo.metaBarrio} sedeco={c.sedeco.monto} sedecoDesbloqueado={c.sedeco.desbloqueado} tono="tarjeta" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 items-center gap-1 rounded-full bg-black/10 px-2.5 text-[13px] font-semibold">
              <Users className="h-3.5 w-3.5" /> {c.calculo.personas}
            </span>
            {c.estado === "juntando" && (
              <span className="flex h-8 items-center gap-1 rounded-full bg-black/10 px-2.5 text-[13px] font-semibold">
                <CalendarClock className="h-3.5 w-3.5" /> {diasRestantes(c.juntarHasta)} d
              </span>
            )}
          </div>
          <span className="cifras text-[15px] font-bold">
            {pesos(c.calculo.juntadoBarrio)} <span className="font-medium opacity-60">/ {pesos(c.calculo.metaBarrio)}</span>
          </span>
        </div>
      </div>
      <ArrowUpRight className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 transition group-hover:opacity-60" />
    </Link>
  );
}
