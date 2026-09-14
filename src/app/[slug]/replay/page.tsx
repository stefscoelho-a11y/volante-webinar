import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import { formatarDataHoraBrasilia } from "@/lib/scheduling";
import { lerUtms } from "@/lib/linksAcesso";
import { getLeadAtual, redirecionarSeMagicLink } from "@/lib/leads";
import { getStatusReplay } from "@/lib/replay";
import { SalaRoom } from "@/components/SalaRoom";
import { CadastroForm } from "@/components/CadastroForm";
import { AvisoPagina } from "@/components/AvisoPagina";
import { cadastrar } from "../actions";

export const dynamic = "force-dynamic";

type ReplayPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Replay: a gravacao sob demanda, liberada so depois da sessao e dentro do
 * prazo configurado (ver src/lib/replay.ts). O video toca do zero pra cada
 * pessoa: a sessao sempre "comeca agora" e a sincronizacao fica desligada.
 */
export default async function ReplayPage({ params, searchParams }: ReplayPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    include: {
      chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] },
    },
  });
  if (!webinar || !webinar.ativo) notFound();

  redirecionarSeMagicLink(slug, "replay", query);

  if (!webinar.replayAtivo) {
    return <AvisoPagina titulo={webinar.titulo} mensagem="O replay deste webinário não está disponível." />;
  }

  const lead = await getLeadAtual(webinar.id, typeof query.a === "string" ? query.a : undefined);
  if (webinar.exigirCadastro && !lead) {
    return (
      <CadastroForm
        titulo={webinar.titulo}
        descricao="Preencha seus dados para assistir ao replay."
        botao="Assistir ao replay"
        action={cadastrar.bind(null, slug, "replay")}
        camposOcultos={lerUtms(query)}
      />
    );
  }

  const status = getStatusReplay(webinar, lead?.sessaoEscolhida ?? null);
  if (status.estado === "aguardando") {
    return (
      <AvisoPagina
        titulo={webinar.titulo}
        mensagem={`O replay fica disponível a partir de ${formatarDataHoraBrasilia(status.liberaEm)} (horário de Brasília).`}
      />
    );
  }
  if (status.estado !== "liberado") {
    return <AvisoPagina titulo={webinar.titulo} mensagem="O prazo para assistir ao replay terminou." />;
  }

  const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
  if (!videoId) {
    return <AvisoPagina titulo="Vídeo do webinário não configurado corretamente." />;
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
      chatAoVivo={{
        webinarId: webinar.id,
        pagina: "replay",
        sessao: "replay",
        participante: lead ? { nome: lead.nome } : null,
      }}
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
