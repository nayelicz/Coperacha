import Link from "next/link";
import { ArrowRight, HandHeart, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { soloLeer } from "@/lib/db";
import { vistaPublica } from "@/lib/logica";
import { horaCorta, pesos } from "@/lib/formato";
import { r2 } from "@/lib/logica";
import TarjetaCoperacha from "@/components/TarjetaCoperacha";
import Insignia, { puntoDe } from "@/components/Insignia";
import { Avatar, Hoja, MontoGrande, PilaAvatares } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const db = await soloLeer();
  const todas = db.coperachas.map(vistaPublica);
  const destacada = todas.find((c) => c.destacada) || todas[0];
  const orden = destacada ? [destacada, ...todas.filter((c) => c.id !== destacada.id).reverse()] : [];

  const juntadoTotal = r2(todas.reduce((s, c) => s + c.calculo.juntadoBarrio, 0));
  const sedecoEncendido = r2(todas.filter((c) => c.sedeco.desbloqueado).reduce((s, c) => s + c.sedeco.monto, 0));

  // "Movimientos": todas las aportaciones, la más nueva primero.
  const movimientos = todas
    .flatMap((c) => c.aportaciones.map((a) => ({ ...a, coperacha: c.nombre, coperachaId: c.id })))
    .sort((a, b) => (b.confirmadaEn || b.creadaEn).localeCompare(a.confirmadaEn || a.creadaEn));
  const confirmados = movimientos.filter((m) => m.estado === "confirmada");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
      {/* Columna oscura: "saldo" del barrio */}
      <div className="space-y-6">
        <section className="animate-subir pt-4">
          <p className="text-[15px] font-medium text-humo">Lo que ha juntado el barrio</p>
          <MontoGrande valor={juntadoTotal} className="mt-1 text-[56px] leading-none sm:text-[64px]" />
          <p className="mt-2 text-[15px] text-humo">
            {sedecoEncendido > 0 ? (
              <>+ <b className="font-semibold text-impulso">{pesos(sedecoEncendido)}</b> de Impulso SEDECO encendido</>
            ) : (
              <>Al 80% se enciende el <b className="font-semibold text-impulso">Impulso SEDECO</b> con el 20% restante</>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {destacada && (
              <Link href={`/coperacha/${destacada.id}`} className="boton-claro">
                <HandHeart className="h-5 w-5" /> Entrarle
              </Link>
            )}
            <Link href="/armar" className="boton-oscuro">
              <Plus className="h-5 w-5" /> Armar mi coperacha
            </Link>
          </div>
        </section>

        {/* Fila "Spending": personas que le entraron */}
        <section className="panel flex items-center justify-between gap-4 p-4 pl-5">
          <div>
            <p className="text-[15px] text-humo">Vecinos que le entraron</p>
            <p className="cifras text-2xl font-bold">{confirmados.length}</p>
          </div>
          <PilaAvatares nombres={Array.from(new Set(confirmados.map((m) => m.nombre)))} max={4} />
        </section>

        {/* Tarjetas neón */}
        {orden.length > 0 && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-semibold">Negocios del barrio</h2>
              <span className="text-[13px] text-humo">{orden.length} {orden.length === 1 ? "activo" : "activos"}</span>
            </div>
            <div className="sin-barra -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:overflow-visible lg:px-0">
              {orden.map((c, i) => (
                <TarjetaCoperacha key={c.id} c={c} i={i} className={`shrink-0 snap-center lg:w-auto ${orden.length === 1 ? "w-full" : "w-[84%] sm:w-[62%]"}`} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Hoja clara: movimientos en vivo */}
      <Hoja className="lg:sticky lg:top-20">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">Movimientos</h2>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-ceniza">
            <span className="h-2 w-2 animate-pulse rounded-full bg-impulso" /> Confirmados por Banxico
          </span>
        </div>

        {movimientos.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-lg font-semibold">Todavía no hay movimientos</p>
            <p className="mt-1 text-ceniza">Sé la primera persona en entrarle a una coperacha.</p>
            {destacada && (
              <Link href={`/coperacha/${destacada.id}`} className="boton-carbon mt-5">
                Entrarle a {destacada.nombre.split(" ")[0]} <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-carbon/[0.06]">
            {movimientos.slice(0, 9).map((m) => (
              <li key={m.id}>
                <Link href={`/coperacha/${m.coperachaId}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/50">
                  <Avatar nombre={m.nombre} punto={puntoDe(m.estado, m.simulado)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.nombre}</p>
                    <p className="truncate text-[14px] text-ceniza">
                      {m.coperacha} · {horaCorta(m.confirmadaEn || m.creadaEn)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="cifras font-semibold">+{pesos(m.monto)}</span>
                    <Insignia estado={m.estado} simulado={m.simulado} modoDemo={m.modoDemo} corta />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-[14px]">
          <div className="flex items-center gap-2 rounded-2xl bg-white/60 p-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-impulso-oscuro" /> No guardamos tu dinero
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/60 p-3">
            <Sparkles className="h-5 w-5 shrink-0 text-barrio-oscuro" /> Ganas +4% o +8%
          </div>
        </div>
      </Hoja>
    </div>
  );
}
