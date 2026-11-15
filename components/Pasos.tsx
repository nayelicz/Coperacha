import type { LucideIcon } from "lucide-react";

/** Micro-guía de 3 pasos, en fila, sobre fondo oscuro. */
export default function Pasos({ titulo, pasos, color = "barrio" }: { titulo?: string; pasos: { icono: LucideIcon; texto: string }[]; color?: "barrio" | "impulso" }) {
  const acento = color === "barrio" ? "bg-barrio text-carbon" : "bg-impulso text-carbon";
  return (
    <div>
      {titulo && <h2 className="mb-3 text-lg font-semibold text-white">{titulo}</h2>}
      <ol className="grid grid-cols-3 gap-2">
        {pasos.map((p, i) => (
          <li key={i} className="panel flex flex-col gap-3 p-3.5">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${i === 0 ? acento : "bg-capa2 text-white"}`}>
              <p.icono className="h-5 w-5" />
            </span>
            <span className="text-[14px] font-medium leading-snug text-white/90 sm:text-[15px]">{p.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
