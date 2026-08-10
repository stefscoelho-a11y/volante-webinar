import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import { AdminPreview } from "@/components/admin/AdminPreview";
import { WebinarStepper } from "@/components/admin/WebinarStepper";

export const dynamic = "force-dynamic";

type PreviewPageProps = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    include: { chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] } },
  });
  if (!webinar) notFound();

  const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
  if (!videoId) {
    return <p className="p-4 text-red-600">Este webinario nao tem um video do YouTube configurado.</p>;
  }

  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <WebinarStepper webinarId={webinar.id} activeKey="preview" />
      </div>
      <AdminPreview
        webinarId={webinar.id}
        titulo={webinar.titulo}
        videoId={videoId}
        videoDurationSeconds={webinar.videoDurationSeconds}
        sincronizarVideoComHorario={webinar.sincronizarVideoComHorario}
        ctaTexto={webinar.ctaTexto}
        ctaLink={webinar.ctaLink}
        pitchTimestampSeconds={webinar.pitchTimestampSeconds}
        ctaDesaparecerSegundos={webinar.ctaDesaparecerSegundos}
        ofertaNome={webinar.ofertaNome}
        ofertaTitulo={webinar.ofertaTitulo}
        ofertaImagemUrl={webinar.ofertaImagemUrl}
        ofertaDescricao={webinar.ofertaDescricao}
        precoOriginal={webinar.precoOriginal}
        precoOferta={webinar.precoOferta}
        ctaCountdownMinutos={webinar.ctaCountdownMinutos}
        metaPixelId={webinar.metaPixelId}
        audienciaFakeMin={webinar.audienciaFakeMin}
        audienciaFakeMax={webinar.audienciaFakeMax}
        chatMessages={webinar.chatMessages.map((message) => ({
          id: message.id,
          timestampSegundos: message.timestampSegundos,
          nomeAutor: message.nomeAutor,
          texto: message.texto,
          tipo: message.tipo,
        }))}
      />
    </div>
  );
}
