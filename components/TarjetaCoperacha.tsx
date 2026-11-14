import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import Progreso from "./Progreso";
import { pesos, diasRestantes } from "@/lib/formato";
import type { CoperachaPublica } from "@/lib/logica";

export const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  juntando: { texto: "Juntando", clase: "bg-barrio-suave text-barrio-oscuro" },
  completa: { texto: "Meta juntada", clase: "bg-impulso-suave text-impulso-oscuro" },
  regresando: { texto: "Regresando dinero", clase: "bg-impulso-suave text-impulso-oscuro" },
  pagada: { texto: "Pagada · Buen pagador", clase: "bg-impulso text-white" },
  vencida: { texto: "Se acabó el tiempo", clase: "bg-[#EFEAE3] text-gris" },
};

export default function TarjetaCoperacha({ c }: { c: CoperachaPublica }) {
  const e = ETIQUETA_ESTADO[c.estado];
  return (
    <Link href={`/coperacha/${c.id}`} className="tarjeta group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold leading-tight">{c.nombre}</h3>
          <p className="mt-0.5 text-gris">{c.proposito}</p>
        </div>
        <span className={`chip shrink-0 ${e.clase}`}>{e.texto}</span>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-gris">
        <MapPin className="h-4 w-4" /> {c.alcaldia}
      </p>
      <Progreso juntado={c.calculo.juntadoBarrio} metaBarrio={c.calculo.metaBarrio} sedeco={c.sedeco.monto} sedecoDesbloqueado={c.sedeco.desbloqueado} />
      <div className="flex items-center justify-between text-sm">
        <span className="text-gris">
          Pide {pesos(c.montoMeta)} · {c.calculo.personas} {c.calculo.personas === 1 ? "persona" : "personas"}
          {c.estado === "juntando" && ` · ${diasRestantes(c.juntarHasta)} días para entrarle`}
        </span>
        <ArrowRight className="h-5 w-5 text-barrio transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
