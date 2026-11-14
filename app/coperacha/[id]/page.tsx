import DetalleEnVivo from "@/components/DetalleEnVivo";

export default function Pagina({ params }: { params: { id: string } }) {
  return <DetalleEnVivo id={params.id} />;
}
