"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

/** Comparte con la hoja nativa del celular o copia el enlace. */
export default function BotonCompartir({ titulo = "Entrarle a la coperacha", texto, className = "", etiqueta = "Compartir" }: { titulo?: string; texto?: string; className?: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false);
  const [nativo, setNativo] = useState(false);
  useEffect(() => setNativo(typeof navigator !== "undefined" && "share" in navigator), []);

  return (
    <button
      type="button"
      className={className || "flex h-10 items-center gap-1.5 rounded-full bg-capa2 px-4 text-[14px] font-semibold text-white transition hover:bg-[#2a2a2e]"}
      onClick={async () => {
        const url = window.location.href;
        if (nativo) {
          await navigator.share({ title: titulo, text: texto, url }).catch(() => undefined);
        } else {
          await navigator.clipboard.writeText(texto ? `${texto} ${url}` : url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }
      }}
    >
      {copiado ? <Check className="h-4 w-4" /> : nativo ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? "¡Copiado!" : etiqueta}
    </button>
  );
}
