"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FlaskConical, HandCoins } from "lucide-react";
import { api } from "@/lib/cliente";

export default function BarraSuperior() {
  const [modoDemo, setModoDemo] = useState<boolean | null>(null);
  const [pey, setPey] = useState(false);

  useEffect(() => {
    api<{ modoDemo: boolean; peyConfigurado: boolean }>("/api/config")
      .then((d) => {
        setModoDemo(d.modoDemo);
        setPey(d.peyConfigurado);
      })
      .catch(() => undefined);
  }, []);

  async function alternar() {
    const nuevo = !modoDemo;
    if (!nuevo && !confirm("¿Apagar el Modo Demo? Los cobros se harán por el monto REAL de la historia.")) return;
    const d = await api<{ modoDemo: boolean }>("/api/config", { modoDemo: nuevo });
    setModoDemo(d.modoDemo);
    window.dispatchEvent(new CustomEvent("modo-demo", { detail: d.modoDemo }));
  }

  return (
    <header className="no-imprimir sticky top-0 z-30 bg-tinta/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-barrio text-carbon">
            <HandCoins className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">Coperacha</span>
        </Link>

        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full bg-capa2 px-3 py-2 text-[13px] font-semibold text-humo"
            title={pey ? "Conectado a la API de pey" : "Sin PEY_API_KEY: solo simulación"}
          >
            <span className={`h-2 w-2 rounded-full ${pey ? "bg-impulso" : "bg-[#5b5852]"}`} />
            <span className="hidden sm:inline">{pey ? "pey conectado" : "pey sin llave"}</span>
            <span className="sm:hidden">pey</span>
          </span>
          {modoDemo !== null && (
            <button
              onClick={alternar}
              aria-pressed={modoDemo}
              title="Modo Demo: a pey se le piden $0.01 por cobro; la pantalla muestra los montos de la historia."
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold transition ${
                modoDemo ? "bg-barrio text-carbon" : "bg-capa2 text-humo"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              <span>Demo $0.01</span>
              <span className={`relative h-5 w-9 rounded-full transition ${modoDemo ? "bg-carbon/25" : "bg-white/10"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${modoDemo ? "left-[18px] bg-carbon" : "left-0.5 bg-humo"}`} />
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
