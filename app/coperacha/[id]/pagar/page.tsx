import PagarYCertificado from "@/components/PagarYCertificado";

export default function Pagina({ params }: { params: { id: string } }) {
  return <PagarYCertificado id={params.id} />;
}
