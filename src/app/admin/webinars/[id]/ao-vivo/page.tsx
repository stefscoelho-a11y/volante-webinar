import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WebinarStepper } from "@/components/admin/WebinarStepper";
import { PainelAoVivo } from "@/components/admin/PainelAoVivo";

export const dynamic = "force-dynamic";

type AoVivoPageProps = { params: Promise<{ id: string }> };

export default async function AoVivoPage({ params }: AoVivoPageProps) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    select: { id: true, titulo: true, slug: true, ativo: true },
  });
  if (!webinar) notFound();

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-xl font-semibold">{webinar.titulo}</h1>
      <WebinarStepper webinarId={webinar.id} activeKey="ao-vivo" />
      <PainelAoVivo webinarId={webinar.id} slug={webinar.slug} ativo={webinar.ativo} />
    </div>
  );
}
