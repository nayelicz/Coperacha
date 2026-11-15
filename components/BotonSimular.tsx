"use client";

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { api } from "@/lib/cliente";

/** Botón discreto de pruebas: pasa por la misma lógica que el webhook real, pero queda marcado como "Simulación". */
export default function BotonSimular({ aportacionId, regresoId, alTerminar, texto }: { aportacionId?: string; regresoId?: string; alTerminar: () => void; texto?: string }) {
  const [cargando, setCargando] = useState(false);
  return (
    <button
      type="button"
      disabled={cargando}
      title="Solo para pruebas en vivo: marca el pago como confirmado sin mover dinero. Se verá como “Simulación”."
      className="flex items-center gap-1 rounded-full border border-dashed border-ceniza/50 px-2.5 py-1 text-xs font-semibold text-ceniza transition hover:border-carbon hover:text-carbon"
      onClick={async () => {
        setCargando(true);
        await api("/api/pey/simular", { aportacionId, regresoId }).catch(() => undefined);
        setCargando(false);
        alTerminar();
      }}
    >
      {cargando ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
      {texto || "Simular pago CoDi confirmado"}
    </button>
  );
}
