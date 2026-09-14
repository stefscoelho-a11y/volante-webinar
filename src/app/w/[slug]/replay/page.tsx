import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import { SalaRoom } from "@/components/SalaRoom";

export const dynamic = "force-dynamic";

type ReplayPageProps = { params: Promise<{ slug: string }> };

/**
 * Replay: assiste o webinario sob demanda, a qualquer momento, sem depender
 * do agendamento. Por isso a sessao sempre "comeca agora" (sessionStartIso =
 * momento do carregamento) e a sincronizacao com relogio fica sempre
 * desligada - o video toca do zero pra cada pessoa, como um video normal.
 */
export default async function ReplayPage({ params }: ReplayPageProps) {
  const { slug } = await params;

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    include: {
      chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] },
    },
  });
  if (!webinar || !webinar.ativo) notFound();

  const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
  if (!videoId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center text-gray-900">
        <p>Video do webinario nao configurado corretamente.</p>
      </div>
    );
  }

  return (
    <SalaRoom
      webinarId={webinar.id}
      titulo={webinar.titulo}
      videoId={videoId}
      videoDurationSeconds={webinar.videoDurationSeconds}
      sessionStartIso={new Date().toISOString()}
      jaEncerradoNoCarregamento={false}
      sincronizarVideoComHorario={false}
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
      temaSala={webinar.temaSala}
      corPrimaria={webinar.corPrimaria}
      corFundo={webinar.corFundo}
      corTexto={webinar.corTexto}
      fonteSala={webinar.fonteSala}
      isReplay
      chatMessages={webinar.chatMessages.map((message) => ({
        id: message.id,
        timestampSegundos: message.timestampSegundos,
        nomeAutor: message.nomeAutor,
        texto: message.texto,
        tipo: message.tipo,
      }))}
    />
  );
}
