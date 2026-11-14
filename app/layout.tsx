import type { Metadata } from "next";
import "./globals.css";
import BarraSuperior from "@/components/BarraSuperior";

export const metadata: Metadata = {
  title: "Coperacha — el impulso colectivo de tu barrio",
  description: "Junta el apoyo de tu barrio para tu negocio, confirmado al instante con CoDi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <BarraSuperior />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">{children}</main>
        <footer className="no-imprimir mx-auto max-w-6xl px-6 pb-10 text-center text-sm text-gris">
          Coperacha no guarda tu dinero: cada pago va directo entre cuentas bancarias con CoDi® de Banco de México, vía la API de pey.
          <br />
          Proyecto para el Hackatón México 2026 · CDMX. El Impulso SEDECO es un modelo propuesto; en esta demo se simula.
        </footer>
      </body>
    </html>
  );
}
