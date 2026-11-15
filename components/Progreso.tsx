import { Lock, Sparkles } from "lucide-react";
import { pesos } from "@/lib/formato";

/**
 * Barra en dos tramos: 80% gente del barrio (naranja) + 20% Impulso SEDECO (lima, se enciende al 80%).
 * `tono="oscuro"` para fondos oscuros; `tono="tarjeta"` para encima de las tarjetas neón.
 */
export default function Progreso({
  juntado,
  metaBarrio,
  sedeco,
  sedecoDesbloqueado,
  grande = false,
  tono = "oscuro",
}: {
  juntado: number;
  metaBarrio: number;
  sedeco: number;
  sedecoDesbloqueado: boolean;
  grande?: boolean;
  tono?: "oscuro" | "tarjeta";
}) {
  const pct = Math.min(100, (juntado / metaBarrio) * 100);
  const alto = grande ? "h-11" : "h-2.5";
  const pista = tono === "oscuro" ? "bg-white/[0.08]" : "bg-carbon/15";
  const relleno = tono === "oscuro" ? "bg-barrio" : "bg-carbon";

  return (
    <div>
      <div className={`flex w-full gap-1.5 ${alto}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${Math.round(pct)}% de la meta del barrio`}>
        <div className={`relative w-[80%] overflow-hidden rounded-l-full ${grande ? "rounded-l-[18px]" : ""} ${pista}`}>
          <div className={`h-full rounded-l-[inherit] transition-all duration-700 ${relleno}`} style={{ width: `${pct}%` }} />
          {grande && (
            <span className={`absolute inset-0 flex items-center px-4 text-sm font-bold ${pct >= 28 ? "text-carbon" : "text-white"}`}>
              {Math.round(pct)}% del barrio
            </span>
          )}
        </div>
        <div className={`relative w-[20%] overflow-hidden rounded-r-full transition-all duration-700 ${grande ? "rounded-r-[18px]" : ""} ${
          sedecoDesbloqueado ? "animate-brillo bg-impulso" : pista
        }`}>
          {grande && (
            <span className={`absolute inset-0 flex items-center justify-center gap-1 text-xs font-bold ${sedecoDesbloqueado ? "text-carbon" : "text-humo"}`}>
              {sedecoDesbloqueado ? <Sparkles className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">SEDECO</span>
            </span>
          )}
        </div>
      </div>

      {grande && (
        <div className="mt-2.5 flex justify-between gap-2 text-[15px]">
          <span className="cifras text-humo">
            <b className="font-semibold text-white">{pesos(juntado)}</b> de {pesos(metaBarrio)} del barrio
          </span>
          <span className={`cifras flex items-center gap-1 font-semibold ${sedecoDesbloqueado ? "text-impulso" : "text-humo"}`}>
            +{pesos(sedeco)}
          </span>
        </div>
      )}
    </div>
  );
}
