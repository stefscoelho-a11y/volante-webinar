import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import {
  getAgendadoSessionStart,
  getElapsedSeconds,
  getFixoSessionStart,
  getSessaoRecorrenteAlcancavel,
  isSessaoEncerrada,
  type RepeticaoAgendado,
} from "@/lib/scheduling";
import { SalaRoom } from "@/components/SalaRoom";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  // sessionStart: override manual (ISO), usado pelo preview do admin (step 7)
  searchParams: Promise<{ sessionStart?: string }>;
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
  overrideIso?: string,
): Date | null {
  if (overrideIso) return new Date(overrideIso);

  switch (webinar.tipoAgendamento) {
    case "recorrente":
      if (!webinar.intervaloRecorrenciaMinutos) return null;
      return getSessaoRecorrenteAlcancavel(webinar.intervaloRecorrenciaMinutos, webinar.videoDurationSeconds);
    case "fixo":
      return getFixoSessionStart((webinar.horariosFixos as string[]) ?? []);
    case "agendado":
      if (!webinar.agendadoDataHoraInicio) return null;
      return getAgendadoSessionStart(
        webinar.agendadoDataHoraInicio,
        (webinar.agendadoRepeticao as RepeticaoAgendado) ?? "nenhuma",
        webinar.agendadoDataHoraFim,
        webinar.videoDurationSeconds,
      );
    case "just_in_time":
      // Precisa do horario de cadastro do lead, resolvido no fluxo de
      // entrada publico (/w/:slug) - implementado no step 8.
      return null;
    default:
      return null;
  }
}

export default async function SalaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { sessionStart: sessionStartOverride } = await searchParams;

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    include: {
      chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] },
    },
  });
  if (!webinar || !webinar.ativo) notFound();

  const sessionStart = resolveSessionStart(webinar, sessionStartOverride);

  if (!sessionStart) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center text-gray-900">
        <div>
          <h1 className="text-xl font-semibold">Nenhuma sessao disponivel agora</h1>
          <p className="mt-2 text-gray-500">
            Este webinario ainda nao tem um horario de sessao configurado corretamente, ou a serie de sessoes ja
            chegou ao fim.
          </p>
        </div>
      </div>
    );
  }

  const elapsedSeconds = getElapsedSeconds(sessionStart);
  const jaEncerrado = isSessaoEncerrada(elapsedSeconds, webinar.videoDurationSeconds);

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
