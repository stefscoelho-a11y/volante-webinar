"use client";

import { useMemo, useState } from "react";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { formatCountdown, isSessaoEncerrada } from "@/lib/scheduling";
import { getFakeViewerCount } from "@/lib/fakeViewers";
import { SalaVideo } from "./SalaVideo";
import { ChatPanel, type ChatMessageData } from "./ChatPanel";
import { OfertaBlock } from "./OfertaBlock";
import { MetaPixel } from "./MetaPixel";

type SalaRoomProps = {
  webinarId: string;
  titulo: string;
  videoId: string;
  videoDurationSeconds: number;
  sessionStartIso: string;
  jaEncerradoNoCarregamento: boolean;
  sincronizarVideoComHorario: boolean;
  ctaTexto: string;
  ctaLink: string;
  pitchTimestampSeconds: number;
  ctaDesaparecerSegundos: number | null;
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaImagemUrl: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  ctaCountdownMinutos: number | null;
  metaPixelId: string | null;
  audienciaFakeMin: number | null;
  audienciaFakeMax: number | null;
  chatMessages: ChatMessageData[];
  isReplay?: boolean;
};

export function SalaRoom({
  webinarId,
  titulo,
  videoId,
  videoDurationSeconds,
  sessionStartIso,
  jaEncerradoNoCarregamento,
  sincronizarVideoComHorario,
  ctaTexto,
  ctaLink,
  pitchTimestampSeconds,
  ctaDesaparecerSegundos,
  ofertaNome,
  ofertaTitulo,
  ofertaImagemUrl,
  ofertaDescricao,
  precoOriginal,
  precoOferta,
  ctaCountdownMinutos,
  metaPixelId,
  audienciaFakeMin,
  audienciaFakeMax,
  chatMessages,
  isReplay = false,
}: SalaRoomProps) {
  const [sessionStart] = useState(() => new Date(sessionStartIso));
  // Relogio da AGENDA: sempre baseado no relogio real, independente do
  // toggle de sincronizacao. Decide se a sala esta aberta (aguardando /
  // ao vivo / encerrada) - isso nunca muda, e o que garante que o horario
  // marcado seja respeitado mesmo com o video "solto".
  const elapsedSeconds = useElapsedSeconds(sessionStart);

  // Relogio do CONTEUDO: o que decide quando o chat e a oferta aparecem.
  // Com sincronizacao ligada, e o mesmo relogio da agenda (comportamento
  // original). Desligada, segue o tempo real do player (reportado pelo
  // SalaVideo) - ja que o video comeca do zero pra cada espectador, faz
  // sentido o chat/oferta comecarem do zero junto.
  const [videoElapsedSeconds, setVideoElapsedSeconds] = useState(0);
  const elapsedParaConteudo = sincronizarVideoComHorario ? elapsedSeconds : videoElapsedSeconds;

  const encerrado = useMemo(
    () => jaEncerradoNoCarregamento || isSessaoEncerrada(elapsedSeconds, videoDurationSeconds),
    [jaEncerradoNoCarregamento, elapsedSeconds, videoDurationSeconds],
  );

  // Deriva SEMPRE do relogio ao vivo (elapsedSeconds), nunca de um prop
  // estatico: diferente de "encerrado" (que e monotonico - uma vez
  // encerrado, nunca deixa de estar), "ainda nao comecou" precisa virar
  // false assim que o tempo passar, entao nao pode ficar "travado" num
  // valor calculado so no carregamento inicial.
  const aindaNaoComecou = !encerrado && elapsedSeconds < 0;

  const viewerCount = getFakeViewerCount(webinarId, Math.max(0, elapsedSeconds), audienciaFakeMin, audienciaFakeMax);

  const pixel = metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null;

  if (encerrado) {
    return (
      <>
        {pixel}
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center text-gray-900">
          <div>
            <h1 className="text-xl font-semibold">Este webinario ja encerrou</h1>
            <p className="mt-2 text-gray-500">Fique de olho no proximo horario disponivel.</p>
          </div>
        </div>
      </>
    );
  }

  if (aindaNaoComecou) {
    return (
      <>
        {pixel}
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center text-gray-900">
          <div>
            <h1 className="text-xl font-semibold">{titulo}</h1>
            <p className="mt-4 text-sm text-gray-500">A sala abre em</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600" suppressHydrationWarning>
              {formatCountdown(-elapsedSeconds)}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {pixel}
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white/80 px-4 py-3">
          <h1 className="text-base font-semibold sm:text-lg">{titulo}</h1>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            {isReplay ? (
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-600">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                REPLAY
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 font-semibold text-red-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                AO VIVO
              </span>
            )}
            <span className="flex items-center gap-1.5 text-gray-500">
              <IconEye />
              {viewerCount}
            </span>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 lg:flex-row">
          <div className="flex-1">
            <SalaVideo
              videoId={videoId}
              sessionStart={sessionStart}
              sincronizarComHorario={sincronizarVideoComHorario}
              onVideoTimeChange={setVideoElapsedSeconds}
            />
          </div>
          <div className="w-full lg:w-80 lg:shrink-0">
            <ChatPanel messages={chatMessages} elapsedSeconds={elapsedParaConteudo} />
          </div>
        </main>
        <OfertaBlock
          ctaTexto={ctaTexto}
          ctaLink={ctaLink}
          pitchTimestampSeconds={pitchTimestampSeconds}
          ctaDesaparecerSegundos={ctaDesaparecerSegundos}
          elapsedSeconds={elapsedParaConteudo}
          ofertaNome={ofertaNome}
          ofertaTitulo={ofertaTitulo}
          ofertaImagemUrl={ofertaImagemUrl}
          ofertaDescricao={ofertaDescricao}
          precoOriginal={precoOriginal}
          precoOferta={precoOferta}
          ctaCountdownMinutos={ctaCountdownMinutos}
        />
      </div>
    </>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
