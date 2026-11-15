"use client";

import { Plus } from "lucide-react";
import { CLABES_EVENTO } from "@/lib/clabes";
import { Avatar } from "./ui";

/**
 * Elegir una CLABE como en "Recipients": avatares de las CLABEs pre-autorizadas del evento + "Otra".
 * `valor` es la CLABE elegida o "otra".
 */
export default function SelectorCuenta({
  valor,
  onCambio,
  otra,
  onOtra,
}: {
  valor: string;
  onCambio: (clabe: string, nombre?: string) => void;
  otra: string;
  onOtra: (v: string) => void;
}) {
  return (
    <div>
      <div className="sin-barra -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {CLABES_EVENTO.map((c) => {
          const on = valor === c.clabe;
          return (
            <button key={c.clabe} type="button" onClick={() => onCambio(c.clabe, c.nombre)} aria-pressed={on}
              className={`flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl p-2 transition ${on ? "bg-carbon text-white" : "hover:bg-white/60"}`}>
              <Avatar nombre={c.nombre} tam={48} />
              <span className="w-full truncate text-center text-[13px] font-semibold leading-tight">{c.nombre.split(" ")[0]}</span>
              <span className={`cifras text-[11px] ${on ? "text-white/60" : "text-ceniza"}`}>•••• {c.clabe.slice(-4)}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => onCambio("otra")} aria-pressed={valor === "otra"}
          className={`flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl p-2 transition ${valor === "otra" ? "bg-carbon text-white" : "hover:bg-white/60"}`}>
          <span className={`grid h-12 w-12 place-items-center rounded-full border-2 border-dashed ${valor === "otra" ? "border-white/40" : "border-carbon/25"}`}>
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-[13px] font-semibold">Otra</span>
          <span className={`text-[11px] ${valor === "otra" ? "text-white/60" : "text-ceniza"}`}>CLABE</span>
        </button>
      </div>
      {valor === "otra" && (
        <input className="campo cifras mt-2" inputMode="numeric" maxLength={18} placeholder="CLABE de 18 dígitos" value={otra}
          onChange={(e) => onOtra(e.target.value.replace(/\D/g, ""))} autoFocus />
      )}
    </div>
  );
}
