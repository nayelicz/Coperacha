"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FlaskConical, HandCoins, Landmark, Wifi, WifiOff } from "lucide-react";

export default function BarraSuperior() {
  const [modoDemo, setModoDemo] = useState<boolean | null>(null);
  const [pey, setPey] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setModoDemo(d.modoDemo);
        setPey(d.peyConfigurado);
      })
      .catch(() => undefined);
  }, []);

  async function alternar() {
    const nuevo = !modoDemo;
    if (!nuevo && !confirm("¿Apagar el Modo Demo? Los cobros se harán por el monto REAL de la historia.")) return;
    const r = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modoDemo: nuevo }) });
    const d = await r.json();
    setModoDemo(d.modoDemo);
    window.dispatchEvent(new CustomEvent("modo-demo", { detail: d.modoDemo }));
  }

  return (
    <header className="no-imprimir sticky top-0 z-30 border-b border-[#EFE8DE] bg-crema/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-barrio text-white">
            <HandCoins className="h-6 w-6" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight">
            Coper<span className="text-barrio">acha</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/cuentas" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-gris hover:bg-white sm:flex" title="CLABEs registradas en pey">
            <Landmark className="h-4 w-4" /> Cuentas
          </Link>
          <span
            className={`chip ${pey ? "bg-impulso-suave text-impulso-oscuro" : "bg-[#F3EEE7] text-gris"}`}
            title={pey ? "Conectado a la API de pey" : "Sin PEY_API_KEY: solo simulación"}
          >
            {pey ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{pey ? "pey conectado" : "pey sin llave"}</span>
          </span>
          {modoDemo !== null && (
            <button
              onClick={alternar}
              className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold transition ${
                modoDemo ? "border-barrio bg-barrio-suave text-barrio-oscuro" : "border-[#E5DED3] bg-white text-gris"
              }`}
              aria-pressed={modoDemo}
            >
              <FlaskConical className="h-4 w-4" />
              <span>Modo Demo $0.01</span>
              <span className={`relative h-5 w-9 rounded-full transition ${modoDemo ? "bg-barrio" : "bg-[#D8D0C4]"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${modoDemo ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
