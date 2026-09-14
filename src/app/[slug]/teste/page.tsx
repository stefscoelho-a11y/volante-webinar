import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import { AdminPreview } from "@/components/admin/AdminPreview";
import { AvisoPagina } from "@/components/AvisoPagina";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type SalaTestePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
};

/**
 * Sala teste: link secreto pra equipe ou cliente conferir a sala sem a senha
 * do admin. Ignora o agendamento e o status ativo, tem controles pra pular no
 * video, nao registra cadastro e nao carrega o Meta Pixel.
 */
export default async function SalaTestePage({ params, searchParams }: SalaTestePageProps) {
  const { slug } = await params;
  const { k } = await searchParams;

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    include: { chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] } },
  });
  if (!webinar || !k || k !== webinar.tokenSalaTeste) notFound();

  const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
  if (!videoId) {
    return <AvisoPagina titulo="Vídeo do webinário não configurado corretamente." />;
  }

  return (
    <div>
      <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
        Sala teste: ignora o agendamento, não registra cadastros e não dispara o Meta Pixel.
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
        metaPixelId={null}
        audienciaFakeMin={webinar.audienciaFakeMin}
        audienciaFakeMax={webinar.audienciaFakeMax}
        temaSala={webinar.temaSala}
        corPrimaria={webinar.corPrimaria}
        corFundo={webinar.corFundo}
        corTexto={webinar.corTexto}
        fonteSala={webinar.fonteSala}
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
