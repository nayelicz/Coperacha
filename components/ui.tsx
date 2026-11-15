import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

/* ---------- Avatares ---------- */

const PASTELES = ["#FFD3B6", "#C9F2A0", "#BFDCFF", "#FFF0A0", "#E6CCFF", "#FFC7D1", "#B8F0E6"];

function tono(texto: string) {
  let h = 0;
  for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PASTELES[h % PASTELES.length];
}

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "?") + (partes[1]?.[0] || "")).toUpperCase();
}

type Punto = "verde" | "amarillo" | "gris" | "naranja";
const COLOR_PUNTO: Record<Punto, string> = {
  verde: "bg-impulso",
  amarillo: "bg-sol",
  gris: "bg-[#BDB4AC]",
  naranja: "bg-barrio",
};

/** Círculo con iniciales y un puntito de estado (como en el diseño de referencia). */
export function Avatar({ nombre, tam = 44, punto, anillo }: { nombre: string; tam?: number; punto?: Punto; anillo?: string }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-full font-bold text-carbon"
      style={{ width: tam, height: tam, background: tono(nombre), fontSize: tam * 0.36, boxShadow: anillo ? `0 0 0 3px ${anillo}` : undefined }}>
      {iniciales(nombre)}
      {punto && (
        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-papel ${COLOR_PUNTO[punto]}`} />
      )}
    </span>
  );
}

/** Pila de avatares encimados + "+N". */
export function PilaAvatares({ nombres, max = 4, borde = "#151517" }: { nombres: string[]; max?: number; borde?: string }) {
  const vis = nombres.slice(0, max);
  const resto = nombres.length - vis.length;
  if (!nombres.length) return null;
  return (
    <div className="flex items-center">
      {vis.map((n, i) => (
        <span key={i} className="-ml-2 first:ml-0">
          <Avatar nombre={n} tam={34} anillo={borde} />
        </span>
      ))}
      {resto > 0 && (
        <span className="-ml-2 grid h-[34px] w-[34px] place-items-center rounded-full bg-capa2 text-xs font-bold text-white" style={{ boxShadow: `0 0 0 3px ${borde}` }}>
          +{resto}
        </span>
      )}
    </div>
  );
}

/* ---------- Montos ---------- */

/** "$ 7,854 .43" — entero grande y centavos chicos, como el saldo del diseño. */
export function MontoGrande({ valor, className = "" }: { valor: number; className?: string }) {
  const [entero, cent] = valor.toFixed(2).split(".");
  const conComas = Number(entero).toLocaleString("es-MX");
  return (
    <p className={`cifras flex items-baseline font-bold ${className}`}>
      <span className="mr-1.5 text-[0.62em] font-semibold opacity-90">$</span>
      <span>{conComas}</span>
      <span className="ml-1 text-[0.42em] font-semibold opacity-60">.{cent}</span>
    </p>
  );
}

/* ---------- Varios ---------- */

export function Hoja({ children, className = "", asa = true, id }: { children: ReactNode; className?: string; asa?: boolean; id?: string }) {
  return (
    <section id={id} className={`hoja p-5 pt-3 sm:p-6 sm:pt-3 ${className}`}>
      {asa && <span className="hoja-asa" aria-hidden />}
      {children}
    </section>
  );
}

export function Cargando({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className={`h-9 w-9 animate-spin ${claro ? "text-carbon" : "text-white/70"}`} />
    </div>
  );
}

export function Aviso({ children, tipo = "atencion" }: { children: ReactNode; tipo?: "atencion" | "error" | "info" }) {
  const cls =
    tipo === "error" ? "bg-red-100 text-red-800" : tipo === "info" ? "bg-white/70 text-carbon" : "bg-[#FFF4C7] text-[#7A5600]";
  return <div className={`flex gap-2 rounded-2xl p-3 text-[15px] font-medium ${cls}`}>{children}</div>;
}

/** Botón redondo de ícono (como los de las tarjetas del diseño). */
export function BotonIcono({ children, titulo, onClick, className = "" }: { children: ReactNode; titulo: string; onClick?: () => void; className?: string }) {
  return (
    <button type="button" title={titulo} aria-label={titulo} onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-full bg-black/10 text-carbon transition hover:bg-black/20 active:scale-95 ${className}`}>
      {children}
    </button>
  );
}
