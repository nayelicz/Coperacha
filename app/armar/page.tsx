import FormArmar from "@/components/FormArmar";

export const metadata = { title: "Armar mi coperacha · Coperacha" };

export default function Armar() {
  return (
    <div className="mx-auto max-w-xl">
      <section className="animate-subir pb-5 pt-4">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">Arma tu coperacha</h1>
        <p className="mt-1 text-lg text-humo">
          Tu barrio junta el 80%. Al llegar, se enciende el <b className="font-semibold text-impulso">Impulso SEDECO</b> con el 20% restante, sin intereses.
        </p>
      </section>
      <FormArmar />
    </div>
  );
}
