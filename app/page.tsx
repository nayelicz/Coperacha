import Link from "next/link";
import { ArrowRight, BadgeCheck, Coins, HandHeart, MapPin, ShieldCheck, Smartphone, Sparkles, Store, Users } from "lucide-react";
import { soloLeer } from "@/lib/db";
import { vistaPublica } from "@/lib/logica";
import { pesos } from "@/lib/formato";
import Progreso from "@/components/Progreso";
import TarjetaCoperacha from "@/components/TarjetaCoperacha";
import FormArmar from "@/components/FormArmar";
import Pasos from "@/components/Pasos";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const db = await soloLeer();
  const todas = db.coperachas.map(vistaPublica);
  const destacada = todas.find((c) => c.destacada) || todas[0];
  const demas = todas.filter((c) => c.id !== destacada?.id).reverse();

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="grid items-center gap-8 pt-4 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="chip bg-impulso-suave text-impulso-oscuro">
            <ShieldCheck className="h-4 w-4" /> Confirmado al instante con CoDi · Banxico
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            El impulso colectivo de <span className="text-barrio">tu barrio</span>.
          </h1>
          <p className="mt-4 max-w-xl text-xl text-gris">
            Tus vecinos le entran de a poquito a tu negocio. Cuando juntan el 80%, se enciende el <b className="text-impulso">Impulso SEDECO</b> con el 20% que falta, sin intereses.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {destacada && (
              <Link href={`/coperacha/${destacada.id}`} className="boton-barrio">
                <HandHeart className="h-6 w-6" /> Entrarle a una coperacha
              </Link>
            )}
            <a href="#armar" className="boton-suave">
              <Store className="h-6 w-6" /> Armar mi coperacha
            </a>
          </div>
          <ul className="mt-6 grid gap-2 text-base text-gris sm:grid-cols-3">
            <li className="flex items-center gap-2"><Coins className="h-5 w-5 text-barrio" /> Ganas +4% o +8%</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-impulso" /> No guardamos tu dinero</li>
            <li className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-barrio" /> Desde tu app del banco</li>
          </ul>
        </div>

        {destacada && (
          <Link href={`/coperacha/${destacada.id}`} className="tarjeta block p-6 transition hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="chip bg-barrio text-white">
                <Sparkles className="h-4 w-4" /> Historia para probar en vivo
              </span>
              {destacada.padronSedeco && (
                <span className="chip bg-impulso-suave text-impulso-oscuro">
                  <BadgeCheck className="h-4 w-4" /> Padrón SEDECO
                </span>
              )}
            </div>
            <h2 className="mt-4 text-3xl font-extrabold">{destacada.nombre}</h2>
            <p className="text-lg text-gris">{destacada.proposito}</p>
            <p className="mt-1 flex items-center gap-1.5 text-gris">
              <MapPin className="h-4 w-4" /> {destacada.alcaldia}
            </p>
            <div className="my-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-crema p-3">
                <p className="text-sm text-gris">Pide</p>
                <p className="text-xl font-extrabold">{pesos(destacada.montoMeta)}</p>
              </div>
              <div className="rounded-xl bg-barrio-suave p-3">
                <p className="text-sm text-barrio-oscuro">Barrio</p>
                <p className="text-xl font-extrabold text-barrio-oscuro">{pesos(destacada.calculo.metaBarrio)}</p>
              </div>
              <div className="rounded-xl bg-impulso-suave p-3">
                <p className="text-sm text-impulso-oscuro">SEDECO</p>
                <p className="text-xl font-extrabold text-impulso-oscuro">{pesos(destacada.sedeco.monto)}</p>
              </div>
            </div>
            <Progreso juntado={destacada.calculo.juntadoBarrio} metaBarrio={destacada.calculo.metaBarrio} sedeco={destacada.sedeco.monto} sedecoDesbloqueado={destacada.sedeco.desbloqueado} grande />
            <p className="mt-4 flex items-center justify-between text-base font-bold text-barrio">
              <span className="flex items-center gap-2 text-gris font-semibold">
                <Users className="h-5 w-5" /> {destacada.calculo.personas} ya le entraron
              </span>
              <span className="flex items-center gap-1">Entrarle <ArrowRight className="h-5 w-5" /></span>
            </p>
          </Link>
        )}
      </section>

      {/* Cómo funciona */}
      <section>
        <Pasos
          titulo="Así funciona, en tres pasos"
          pasos={[
            { icono: HandHeart, texto: "Elige cuánto poner" },
            { icono: Smartphone, texto: "Autoriza en tu banco con CoDi" },
            { icono: Coins, texto: "Recibe tu ganancia a los 30 días" },
          ]}
        />
      </section>

      {/* Negocios del barrio */}
      {demas.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-extrabold sm:text-3xl">Negocios del barrio</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {demas.map((c) => (
              <TarjetaCoperacha key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      {/* Armar */}
      <section id="armar" className="scroll-mt-24">
        <Pasos
          titulo="Arma tu coperacha en un minuto"
          pasos={[
            { icono: Store, texto: "Cuéntanos de tu negocio" },
            { icono: Users, texto: "Comparte el enlace con tu barrio" },
            { icono: Sparkles, texto: "Al 80% se enciende tu Impulso SEDECO" },
          ]}
        />
        <div className="mx-auto max-w-2xl">
          <FormArmar />
        </div>
      </section>
    </div>
  );
}
