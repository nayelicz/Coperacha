import { Sparkles, Users } from "lucide-react";
import { pesos } from "@/lib/formato";

/** Barra en dos tramos: 80% gente del barrio (terracota) + 20% Impulso SEDECO (esmeralda). */
export default function Progreso({
  juntado,
  metaBarrio,
  sedeco,
  sedecoDesbloqueado,
  grande = false,
}: {
  juntado: number;
  metaBarrio: number;
  sedeco: number;
  sedecoDesbloqueado: boolean;
  grande?: boolean;
}) {
  const pct = Math.min(100, (juntado / metaBarrio) * 100);
  const alto = grande ? "h-9" : "h-4";

  return (
    <div>
      <div className={`flex w-full gap-1.5 ${alto}`}>
        <div className="relative w-[80%] overflow-hidden rounded-l-full bg-barrio-suave">
          <div className="h-full rounded-l-full bg-barrio transition-all duration-700" style={{ width: `${pct}%` }} />
          {grande && (
            <span className={`absolute inset-0 flex items-center px-4 text-sm font-bold ${pct >= 30 ? "text-white drop-shadow" : "text-barrio-oscuro"}`}>
              {Math.round(pct)}% del barrio
            </span>
          )}
        </div>
        <div
          className={`relative w-[20%] overflow-hidden rounded-r-full transition-all duration-700 ${
            sedecoDesbloqueado ? "bg-impulso animate-brillo" : "bg-[#E9E4DC]"
          }`}
        >
          {grande && (
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${sedecoDesbloqueado ? "text-white" : "text-gris"}`}>
              {sedecoDesbloqueado ? "¡Encendido!" : "SEDECO"}
            </span>
          )}
        </div>
      </div>

      <div className={`mt-2 flex justify-between gap-2 ${grande ? "text-base" : "text-sm"}`}>
        <span className="flex items-center gap-1.5 font-semibold text-barrio-oscuro">
          <Users className="h-4 w-4" />
          {pesos(juntado)} <span className="font-normal text-gris">de {pesos(metaBarrio)} del barrio</span>
        </span>
        <span className={`flex items-center gap-1 font-semibold ${sedecoDesbloqueado ? "text-impulso" : "text-gris"}`}>
          <Sparkles className="h-4 w-4" />+{pesos(sedeco)}
        </span>
      </div>
    </div>
  );
}
