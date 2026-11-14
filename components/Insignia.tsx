import { FlaskConical, Hourglass, RotateCcw, ShieldCheck } from "lucide-react";

/** Deja clarísimo si un pago es real (confirmado por Banxico vía pey) o simulado. */
export default function Insignia({ estado, simulado, modoDemo }: { estado: string; simulado: boolean; modoDemo?: boolean }) {
  if (estado === "pendiente")
    return (
      <span className="chip bg-[#FFF6E0] text-[#8A5A00]">
        <Hourglass className="h-4 w-4" /> Esperando que autorice en su banco
      </span>
    );
  if (estado === "devolucion_pendiente")
    return (
      <span className="chip bg-barrio-suave text-barrio-oscuro">
        <RotateCcw className="h-4 w-4" /> Llegó tarde · se le regresa
      </span>
    );
  if (simulado)
    return (
      <span className="chip border border-dashed border-[#B5ADA2] bg-[#F3EEE7] text-gris" title="Este pago se simuló con el botón de pruebas. No hubo movimiento de dinero.">
        <FlaskConical className="h-4 w-4" /> Simulación · no es pago real
      </span>
    );
  return (
    <span className="chip bg-impulso-suave text-impulso-oscuro" title={modoDemo ? "Pago real de $0.01 (Modo Demo)" : "Pago real"}>
      <ShieldCheck className="h-4 w-4" /> Confirmado al instante con CoDi / Banxico{modoDemo ? " · $0.01" : ""}
    </span>
  );
}
