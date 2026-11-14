import type { LucideIcon } from "lucide-react";

/** Micro-guía: título de una línea + 3 pasos visuales. */
export default function Pasos({ titulo, pasos, color = "barrio" }: { titulo: string; pasos: { icono: LucideIcon; texto: string }[]; color?: "barrio" | "impulso" }) {
  const fondo = color === "barrio" ? "bg-barrio-suave text-barrio-oscuro" : "bg-impulso-suave text-impulso-oscuro";
  return (
    <div className="mb-6">
      <h2 className="mb-3 text-2xl font-extrabold sm:text-3xl">{titulo}</h2>
      <ol className="grid gap-2 sm:grid-cols-3">
        {pasos.map((p, i) => (
          <li key={i} className="tarjeta flex items-center gap-3 p-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${fondo}`}>
              <p.icono className="h-6 w-6" />
            </span>
            <span className="text-base font-semibold leading-snug">
              <span className="mr-1 text-gris">{i + 1}.</span>
              {p.texto}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
