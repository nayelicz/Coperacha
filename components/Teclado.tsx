"use client";

import { Delete } from "lucide-react";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "borrar"] as const;

/** Teclado numérico grande (pantalla "Send" del diseño). Maneja el monto como texto de dígitos. */
export default function Teclado({ valor, onCambio, max = 7 }: { valor: string; onCambio: (v: string) => void; max?: number }) {
  function tocar(t: (typeof TECLAS)[number]) {
    if (t === "borrar") return onCambio(valor.slice(0, -1));
    const nuevo = (valor + t).replace(/^0+/, "");
    if (nuevo.length <= max) onCambio(nuevo);
  }
  return (
    <div className="grid grid-cols-3 gap-1">
      {TECLAS.map((t) => (
        <button key={t} type="button" onClick={() => tocar(t)} aria-label={t === "borrar" ? "Borrar" : t}
          className="cifras grid h-14 place-items-center rounded-2xl text-2xl font-medium text-carbon transition hover:bg-white/60 active:scale-95 active:bg-white">
          {t === "borrar" ? <Delete className="h-6 w-6" /> : t}
        </button>
      ))}
    </div>
  );
}
