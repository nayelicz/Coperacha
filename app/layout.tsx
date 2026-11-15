import type { Metadata, Viewport } from "next";
import "./globals.css";
import BarraSuperior from "@/components/BarraSuperior";
import NavInferior from "@/components/NavInferior";

export const metadata: Metadata = {
  title: "Coperacha — el impulso colectivo de tu barrio",
  description: "Junta el apoyo de tu barrio para tu negocio, confirmado al instante con CoDi.",
};

export const viewport: Viewport = { themeColor: "#0B0B0C", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <BarraSuperior />
        <main className="mx-auto max-w-5xl px-4 pb-36 pt-2 sm:px-6">{children}</main>
        <footer className="no-imprimir mx-auto max-w-xl px-6 pb-32 text-center text-[13px] leading-relaxed text-humo">
          Coperacha no guarda tu dinero: cada pago va directo entre cuentas bancarias con CoDi® de Banco de México, vía la API de pey.
          El Impulso SEDECO es un modelo propuesto; en esta demo se simula. · Hackatón México 2026 · CDMX
        </footer>
        <NavInferior />
      </body>
    </html>
  );
}
