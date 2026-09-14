import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import {
  getAgendadoSessionStart,
  getElapsedSeconds,
  getFixoSessionStart,
  getFixoSessionStartParaHorario,
  getSessaoRecorrenteAlcancavel,
  isSessaoEncerrada,
  type RepeticaoAgendado,
} from "@/lib/scheduling";
import { webinarPath } from "@/lib/linksAcesso";
import { getLeadAtual } from "@/lib/leads";
import { SalaRoom } from "@/components/SalaRoom";
import { AvisoPagina } from "@/components/AvisoPagina";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  // a: token de acesso do participante; modo=jit: usa a sessao just in time
  // do participante; h: horario escolhido na entrada (tipo fixo). Nenhum
  // horario arbitrario e aceito pela URL.
  searchParams: Promise<{ a?: string; modo?: string; h?: string }>;
};

function resolveSessionStart(
  webinar: {
    tipoAgendamento: string;
    intervaloRecorrenciaMinutos: number | null;
    horariosFixos: unknown;
    videoDurationSeconds: number;
    agendadoDataHoraInicio: Date | null;
    agendadoDataHoraFim: Date | null;
    agendadoRepeticao: string | null;
  },
  horarioEscolhido?: string,
): Date | null {
  switch (webinar.tipoAgendamento) {
    case "recorrente":
      if (!webinar.intervaloRecorrenciaMinutos) return null;
      return getSessaoRecorrenteAlcancavel(webinar.intervaloRecorrenciaMinutos, webinar.videoDurationSeconds);
    case "fixo": {
      const horariosFixos = Array.isArray(webinar.horariosFixos) ? (webinar.horariosFixos as string[]) : [];
      return horarioEscolhido
        ? getFixoSessionStartParaHorario(horarioEscolhido, horariosFixos, webinar.videoDurationSeconds)
        : getFixoSessionStart(horariosFixos);
    }
    case "agendado":
      if (!webinar.agendadoDataHoraInicio) return null;
      return getAgendadoSessionStart(
        webinar.agendadoDataHoraInicio,
        (webinar.agendadoRepeticao as RepeticaoAgendado) ?? "nenhuma",
        webinar.agendadoDataHoraFim,
        webinar.videoDurationSeconds,
      );
    default:
      return null;
  }
}

export default async function SalaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { a: token, modo, h: horarioEscolhido } = await searchParams;

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    include: {
      chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] },
    },
  });
  if (!webinar || !webinar.ativo) notFound();

  const lead = await getLeadAtual(webinar.id, token);
  const modoJustInTime =
    webinar.tipoAgendamento === "just_in_time" || (modo === "jit" && webinar.justInTimeAtivo);

  let sessionStart: Date | null;
  if (modoJustInTime) {
    // A sessao just in time pertence ao participante: sem cadastro, volta pro formulario
    if (!lead || !lead.sessaoEscolhida) {
      redirect(webinar.tipoAgendamento === "just_in_time" ? webinarPath(slug) : webinarPath(slug, "jit"));
    }
    sessionStart = lead.sessaoEscolhida;
  } else {
    if (webinar.exigirCadastro && !lead) redirect(webinarPath(slug));
    sessionStart = resolveSessionStart(webinar, horarioEscolhido);
    // Primeira sessao do participante: referencia pra liberar o replay dele
    if (lead && sessionStart && !lead.sessaoEscolhida) {
      await prisma.lead.update({ where: { id: lead.id }, data: { sessaoEscolhida: sessionStart } });
    }
  }

  if (!sessionStart) {
    return (
      <AvisoPagina
        titulo="Nenhuma sessão disponível agora"
        mensagem="Este webinário ainda não tem um horário de sessão configurado corretamente, ou a série de sessões já chegou ao fim."
      />
    );
  }

  const elapsedSeconds = getElapsedSeconds(sessionStart);
  const jaEncerrado = isSessaoEncerrada(elapsedSeconds, webinar.videoDurationSeconds);

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
      sessionStartIso={sessionStart.toISOString()}
      jaEncerradoNoCarregamento={jaEncerrado}
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
  );
}
