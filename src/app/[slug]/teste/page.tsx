import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import { AdminPreview } from "@/components/admin/AdminPreview";
import { AvisoPagina } from "@/components/AvisoPagina";
import { encontrarCanal, resolverOferta } from "@/lib/canaisOferta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type SalaTestePageProps = {
  params: Promise<{ slug: string }>;
  // ir=oferta: abre a sala teste ja no ponto do CTA, sem precisar clicar em
  // "No CTA" manualmente - usado pelo link "Sala teste (direto na oferta)".
  searchParams: Promise<{ k?: string; c?: string; ir?: string }>;
};

/**
 * Sala teste: link secreto pra equipe ou cliente conferir a sala sem a senha
 * do admin. Ignora o agendamento e o status ativo, tem controles pra pular no
 * video, nao registra cadastro e nao carrega o Meta Pixel.
 */
export default async function SalaTestePage({ params, searchParams }: SalaTestePageProps) {
  const { slug } = await params;
  const { k, c: canalDaUrl, ir } = await searchParams;

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    include: {
      chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] },
      canais: true,
    },
  });
  if (!webinar || !k || k !== webinar.tokenSalaTeste) notFound();

  const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
  if (!videoId) {
    return <AvisoPagina titulo="Vídeo do webinário não configurado corretamente." />;
  }

  const canalEncontrado = encontrarCanal(webinar.canais, canalDaUrl ?? null, null);
  const oferta = resolverOferta(webinar, canalEncontrado);

  return (
    <div>
      <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
        Sala teste: ignora o agendamento, não registra cadastros e não dispara o Meta Pixel.
        {canalEncontrado && <span className="font-semibold"> Canal: {canalEncontrado.nome}.</span>}
      </div>
      <AdminPreview
        webinarId={webinar.id}
        titulo={webinar.titulo}
        videoId={videoId}
        videoDurationSeconds={webinar.videoDurationSeconds}
        sincronizarVideoComHorario={webinar.sincronizarVideoComHorario}
        ctaTexto={oferta.ctaTexto}
        ctaLink={oferta.ctaLink}
        pitchTimestampSeconds={webinar.pitchTimestampSeconds}
        ctaDesaparecerSegundos={oferta.ctaDesaparecerSegundos}
        ofertaNome={oferta.ofertaNome}
        ofertaTitulo={oferta.ofertaTitulo}
        ofertaImagemUrl={oferta.ofertaImagemUrl}
        ofertaDescricao={oferta.ofertaDescricao}
        precoOriginal={oferta.precoOriginal}
        precoOferta={oferta.precoOferta}
        precoParcelado={oferta.precoParcelado}
        ctaCountdownMinutos={oferta.ctaCountdownMinutos}
        metaPixelId={null}
        abrirNaOferta={ir === "oferta"}
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
        canalSlug={canalEncontrado?.slug ?? null}
        agenteIaAtivo={webinar.agenteIaAtivo}
        agenteNome={webinar.agenteNome}
        agenteFotoUrl={webinar.agenteFotoUrl}
      />
    </div>
  );
}
