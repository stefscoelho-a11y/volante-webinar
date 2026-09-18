"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { formatCountdown, isSessaoEncerrada } from "@/lib/scheduling";
import { getFakeViewerCount } from "@/lib/fakeViewers";
import { SalaVideo } from "./SalaVideo";
import { ChatPanel, type ChatMessageData } from "./ChatPanel";
import type { ChatAoVivoConfig } from "@/lib/chatAoVivo";
import { OfertaBlock } from "./OfertaBlock";
import { MetaPixel } from "./MetaPixel";
import { SuporteFlutuante } from "./SuporteFlutuante";
import {
  getContrastColor,
  parseFonteSala,
  parseHexColor,
  parseTemaSala,
  VISUAL_DEFAULTS,
} from "@/lib/webinarVisual";

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
  precoParcelado: string | null;
  ctaCountdownMinutos: number | null;
  metaPixelId: string | null;
  audienciaFakeMin: number | null;
  audienciaFakeMax: number | null;
  chatMessages: ChatMessageData[];
  temaSala: string;
  corPrimaria: string;
  corFundo: string;
  corTexto: string;
  fonteSala: string;
  isReplay?: boolean;
  // Comentarios reais e presenca (painel Ao vivo). Sem isso (preview do
  // admin, sala teste) o chat fica so com o roteiro.
  chatAoVivo?: ChatAoVivoConfig;
  // Slug do canal resolvido (?c=) - so pra buscar a oferta certa no agente
  // de suporte; a config do agente em si nao varia por canal.
  canalSlug?: string | null;
  agenteIaAtivo?: boolean;
  agenteNome?: string | null;
  agenteFotoUrl?: string | null;
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
  precoParcelado,
  ctaCountdownMinutos,
  metaPixelId,
  audienciaFakeMin,
  audienciaFakeMax,
  chatMessages,
  temaSala,
  corPrimaria,
  corFundo,
  corTexto,
  fonteSala,
  isReplay = false,
  chatAoVivo,
  canalSlug = null,
  agenteIaAtivo = false,
  agenteNome = null,
  agenteFotoUrl = null,
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
  const tema = parseTemaSala(temaSala);
  const fonte = parseFonteSala(fonteSala);
  const accent = parseHexColor(corPrimaria, VISUAL_DEFAULTS.corPrimaria);
  const background = parseHexColor(corFundo, VISUAL_DEFAULTS.corFundo);
  const foreground = parseHexColor(corTexto, VISUAL_DEFAULTS.corTexto);
  const visualStyle = {
    "--room-accent": accent,
    "--room-accent-contrast": getContrastColor(accent),
    "--room-background": background,
    "--room-foreground": foreground,
  } as CSSProperties;

  const pixel = metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null;

  if (encerrado) {
    return (
      <>
        {pixel}
        <div className="webinar-room flex items-center justify-center p-6 text-center" data-room-font={fonte} style={visualStyle}>
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
        <div className="webinar-room flex items-center justify-center p-6 text-center" data-room-font={fonte} style={visualStyle}>
          <div>
            <h1 className="text-xl font-semibold">{titulo}</h1>
            <p className="mt-4 text-sm text-gray-500">A sala abre em</p>
            <p className="room-accent-text mt-1 text-3xl font-bold tabular-nums" suppressHydrationWarning>
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
      <div className="webinar-room flex flex-col" data-theme={tema} data-room-font={fonte} style={visualStyle}>
        {tema === "hotwebinar" && (
          <header className="mx-auto hidden w-full max-w-[1600px] px-3 pb-3 pt-4 sm:block sm:px-5 sm:pt-5">
            <h1 className="text-balance text-xl font-bold tracking-[-0.025em] sm:text-2xl lg:text-[1.75rem]">{titulo}</h1>
          </header>
        )}

        <main
          className={`mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-3 px-0 pb-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_clamp(19rem,29vw,27rem)] ${
            tema === "youtube" ? "pt-3 sm:pt-5" : ""
          }`}
        >
          <section className="min-w-0">
            <SalaVideo
              videoId={videoId}
              sessionStart={sessionStart}
              sincronizarComHorario={sincronizarVideoComHorario}
              tema={tema}
              videoDurationSeconds={videoDurationSeconds}
              statusLabel={isReplay ? "Replay" : "Ao vivo"}
              viewerCount={viewerCount}
              onVideoTimeChange={setVideoElapsedSeconds}
            />

            {tema === "youtube" && (
              <div className="px-3 pb-1 pt-4 sm:px-2 sm:pt-5">
                <h1 className="text-balance text-xl font-bold tracking-[-0.025em] sm:text-2xl">{titulo}</h1>
                <div className="room-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
                  <span className="room-accent-text font-semibold">{isReplay ? "Replay" : "Ao vivo"}</span>
                  <span aria-hidden="true" className="opacity-40">|</span>
                  <span className="flex items-center gap-1.5 tabular-nums"><IconEye /> {viewerCount.toLocaleString("pt-BR")} assistindo</span>
                </div>
              </div>
            )}

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
              precoParcelado={precoParcelado}
              ctaCountdownMinutos={ctaCountdownMinutos}
            />
          </section>

          <div className={`px-3 sm:px-0 lg:min-h-0 ${tema === "hotwebinar" ? "min-h-[52rem]" : "min-h-[24rem]"}`}>
            <ChatPanel
              messages={chatMessages}
              elapsedSeconds={elapsedParaConteudo}
              tema={tema}
              viewerCount={viewerCount}
              chatAoVivo={chatAoVivo}
            />
          </div>
        </main>

        {tema === "hotwebinar" && (
          <footer className="room-muted mx-auto mt-auto flex w-full max-w-[1600px] justify-end gap-4 border-t px-5 py-3 text-[10px] uppercase tracking-wide" style={{ borderColor: "var(--room-border)" }}>
            <span className="flex items-center gap-1"><IconShield /> Site seguro</span>
            <span className="flex items-center gap-1"><IconLock /> Privacidade protegida</span>
          </footer>
        )}

        {agenteIaAtivo && (
          <SuporteFlutuante
            webinarId={webinarId}
            canalSlug={canalSlug}
            nome={agenteNome}
            fotoUrl={agenteFotoUrl}
            pitchTimestampSeconds={pitchTimestampSeconds}
            elapsedSeconds={elapsedParaConteudo}
          />
        )}
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

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 room-accent-text">
      <path d="M12 3 5 6v5c0 4.7 2.8 8.3 7 10 4.2-1.7 7-5.3 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 room-accent-text">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
