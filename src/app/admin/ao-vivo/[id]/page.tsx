import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { PainelAoVivo } from "@/components/admin/PainelAoVivo";

export const dynamic = "force-dynamic";

type AoVivoWebinarPageProps = { params: Promise<{ id: string }> };

export default async function AoVivoWebinarPage({ params }: AoVivoWebinarPageProps) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    select: { id: true, titulo: true, slug: true, ativo: true },
  });
  if (!webinar) notFound();

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/admin/ao-vivo" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />
          Ao vivo
        </Link>
        <div className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{webinar.titulo}</h1>
            <p className="mt-1 text-sm text-gray-500">Quem está na sala agora e os comentários dos participantes.</p>
          </div>
          <Link
            href={`/admin/webinars/${webinar.id}/editar`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Configurar webinário
          </Link>
        </div>
        <PainelAoVivo webinarId={webinar.id} slug={webinar.slug} ativo={webinar.ativo} />
      </div>
    </AdminShell>
  );
}
