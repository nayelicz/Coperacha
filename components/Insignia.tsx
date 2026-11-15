import { FlaskConical, Hourglass, RotateCcw, ShieldCheck } from "lucide-react";

/** Deja clarísimo si un pago es real (confirmado por Banxico vía pey) o simulado. Pensada para hojas claras. */
export default function Insignia({ estado, simulado, modoDemo, corta = false }: { estado: string; simulado: boolean; modoDemo?: boolean; corta?: boolean }) {
  if (estado === "pendiente")
    return (
      <span className="chip bg-[#FFF1B8] text-[#6E4E00]">
        <Hourglass className="h-3.5 w-3.5" /> {corta ? "Esperando" : "Esperando que autorice en su banco"}
      </span>
    );
  if (estado === "devolucion_pendiente")
    return (
      <span className="chip bg-barrio-suave text-barrio-oscuro">
        <RotateCcw className="h-3.5 w-3.5" /> Llegó tarde · se le regresa
      </span>
    );
  if (simulado)
    return (
      <span className="chip border border-dashed border-ceniza/60 bg-white/50 text-ceniza" title="Este pago se simuló con el botón de pruebas. No hubo movimiento de dinero.">
        <FlaskConical className="h-3.5 w-3.5" /> {corta ? "Simulación" : "Simulación · no es pago real"}
      </span>
    );
  return (
    <span className="chip bg-carbon text-impulso" title={modoDemo ? "Pago real de $0.01 (Modo Demo)" : "Pago real"}>
      <ShieldCheck className="h-3.5 w-3.5" /> {corta ? "CoDi" : "Confirmado con CoDi / Banxico"}
      {modoDemo ? " · $0.01" : ""}
    </span>
  );
}

/** Color del puntito del avatar según el estado del pago. */
export function puntoDe(estado: string, simulado: boolean): "verde" | "amarillo" | "gris" | "naranja" {
  if (estado === "pendiente") return "amarillo";
  if (estado === "devolucion_pendiente") return "naranja";
  return simulado ? "gris" : "verde";
}
