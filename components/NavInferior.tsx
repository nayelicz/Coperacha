"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, Plus } from "lucide-react";

const ITEMS = [
  { href: "/armar", etiqueta: "Armar", icono: Plus },
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/cuentas", etiqueta: "Cuentas", icono: CreditCard },
];

/** Barra flotante en píldora, como la del diseño de referencia. */
export default function NavInferior() {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/" ? ruta === "/" || ruta.startsWith("/coperacha") : ruta.startsWith(href));

  return (
    <nav className="no-imprimir fixed inset-x-0 bottom-5 z-40 flex justify-center px-4" aria-label="Navegación principal">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#1A1A1D]/90 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {ITEMS.map(({ href, etiqueta, icono: I }) => {
          const on = activo(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`flex h-12 items-center justify-center gap-2 rounded-full transition-all ${
                on ? "bg-papel px-5 text-carbon" : "w-14 text-humo hover:text-white"
              }`}
            >
              <I className="h-5 w-5" />
              {on && <span className="text-[15px] font-semibold">{etiqueta}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
