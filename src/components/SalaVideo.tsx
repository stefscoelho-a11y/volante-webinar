"use client";

import { useEffect, useRef, useState } from "react";
import { getElapsedSeconds } from "@/lib/scheduling";
import type { YouTubePlayer } from "@/lib/youtubePlayerTypes";
import type { TemaSala } from "@/lib/webinarVisual";

/**
 * Comportamento ao pausar (ver instrucoes do projeto):
 * (a) fake-live "de verdade": se o usuario pausar, o relogio real continua
 *     andando. Ao dar play de novo, pulamos o video pra frente ate alcancar
 *     o tempo real (como EverWebinar/WebinarJam no modo automatico).
 * (b) pausa "de verdade": o video para no tempo dele e so volta a sincronizar
 *     se/quando decidirmos re-alinhar.
 * Padrao adotado: (a) quando sincronizarComHorario esta ligado. Na pratica o
 * espectador nem consegue pausar/avancar/voltar: controles nativos desligados
 * (controls:0, disablekb:1) e o iframe com pointer-events desligado. Isso
 * continua existindo como rede de seguranca (ex: buffer que pausa sozinho).
 */

// Se o player e o relogio real divergirem mais que isso (em segundos),
// tratamos como "estava pausado" e re-sincronizamos com um seek.
const DRIFT_TOLERANCE_SECONDS = 2;

// Intervalo de leitura do tempo atual do player, reportado pro componente
// pai via onVideoTimeChange (usado quando a sincronizacao esta desligada,
// pra chat/CTA seguirem o tempo do video em vez do relogio real).
const VIDEO_TIME_POLL_MS = 500;

function loadYouTubeApiOnce(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.getElementById("youtube-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
  });
}

type SalaVideoProps = {
  videoId: string;
  sessionStart: Date;
  // Se true (padrao): o video pula pro ponto do relogio real ao carregar e
  // se re-sincroniza sozinho (fake-live de verdade). Se false: o video
  // sempre comeca do zero pra cada espectador - o agendamento (aguardando/
  // encerrado) continua valendo do mesmo jeito, so o seek muda.
  sincronizarComHorario: boolean;
  tema: TemaSala;
  videoDurationSeconds: number;
  statusLabel: string;
  viewerCount: number;
  // Reporta o tempo atual do player pro componente pai a cada tick. Usado
  // pra decidir quando o chat/CTA devem aparecer quando a sincronizacao
  // esta desligada (nesse caso eles seguem o tempo do video, nao o relogio).
  onVideoTimeChange: (seconds: number) => void;
};

export function SalaVideo({
  videoId,
  sessionStart,
  sincronizarComHorario,
  tema,
  videoDurationSeconds,
  statusLabel,
  viewerCount,
  onVideoTimeChange,
}: SalaVideoProps) {
  // Navegadores bloqueiam autoplay COM SOM sem gesto previo do usuario.
  // Pra garantir que o autoplay sempre funcione (essencial pro efeito de
  // "ao vivo"), o player sempre comeca mudo (mute:1) e mostramos um prompt
  // clicavel "ativar som" - o clique conta como gesto do usuario e libera
  // o audio a partir dali.
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const onVideoTimeChangeRef = useRef(onVideoTimeChange);

  useEffect(() => {
    onVideoTimeChangeRef.current = onVideoTimeChange;
  }, [onVideoTimeChange]);

  useEffect(() => {
    let destroyed = false;

    loadYouTubeApiOnce().then(() => {
      if (destroyed) return;

      new window.YT.Player("youtube-player-target", {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          // Sem barra de progresso, sem botao de play/pause, sem teclado e
          // sem fullscreen nativo: o espectador nao pode voltar, avancar ou
          // pausar o "ao vivo". So o volume (controle custom abaixo) fica
          // liberado.
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            setVolume(event.target.getVolume());

            // Seek inicial: com sincronizacao ligada, pula pro ponto do
            // relogio real (nunca comeca do zero). Desligada, comeca do
            // zero de proposito - cada espectador assiste do inicio.
            const startAt = sincronizarComHorario ? getElapsedSeconds(sessionStart) : 0;
            event.target.seekTo(startAt, true);
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (!sincronizarComHorario) return;
            if (event.data !== window.YT.PlayerState.PLAYING) return;

            // Toda vez que o video volta a tocar (incluindo apos um pause),
            // conferimos se o tempo do player bateu com o relogio real. Se
            // divergiu (o usuario ficou pausado por alguns segundos), damos
            // um seek pra frente pra "alcancar" o tempo real - e assim que o
            // EverWebinar/WebinarJam simulam o "ao vivo".
            const elapsedReal = getElapsedSeconds(sessionStart);
            const tempoDoPlayer = event.target.getCurrentTime();
            if (Math.abs(elapsedReal - tempoDoPlayer) > DRIFT_TOLERANCE_SECONDS) {
              event.target.seekTo(elapsedReal, true);
            }
          },
        },
      });
    });

    const poll = window.setInterval(() => {
      const current = playerRef.current?.getCurrentTime();
      if (typeof current === "number") {
        setCurrentTime(current);
        onVideoTimeChangeRef.current(current);
      }
    }, VIDEO_TIME_POLL_MS);

    return () => {
      destroyed = true;
      window.clearInterval(poll);
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMute() {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
    setShowUnmutePrompt(false);
  }

  function handleVolumeChange(newVolume: number) {
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(newVolume);
    setVolume(newVolume);
    if (newVolume === 0) {
      player.mute();
      setMuted(true);
    } else if (player.isMuted()) {
      player.unMute();
      setMuted(false);
    }
    setShowUnmutePrompt(false);
  }

  async function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frame.requestFullscreen();
  }

  const progress = Math.min(100, Math.max(0, (currentTime / videoDurationSeconds) * 100));
  const isYouTube = tema === "youtube";

  return (
    <div
      ref={frameRef}
      className={`group relative aspect-video w-full overflow-hidden bg-black ${isYouTube ? "rounded-xl" : "rounded-lg"}`}
    >
      {/* pointer-events-none bloqueia qualquer clique/toque/scroll no
          iframe do YouTube (inclusive botao direito), impedindo o
          espectador de interagir com o player por fora do nosso codigo */}
      <div className="pointer-events-none h-full w-full">
        <div id="youtube-player-target" className="h-full w-full" />
      </div>

      <div className="pointer-events-none absolute left-2 top-2 z-20 flex overflow-hidden rounded-md text-[11px] font-semibold shadow-sm sm:left-3 sm:top-3 sm:text-xs">
        <span className="room-accent-bg flex items-center gap-1.5 px-2.5 py-2 sm:px-3">
          <IconBroadcast />
          {statusLabel}
        </span>
        <span className="flex items-center gap-1.5 bg-white/95 px-2.5 py-2 text-slate-800 sm:px-3">
          <IconEye />
          {viewerCount.toLocaleString("pt-BR")}
        </span>
      </div>

      {showUnmutePrompt && (
        <button
          type="button"
          onClick={toggleMute}
          className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/35 transition duration-300 hover:bg-black/45"
        >
          <span className="flex min-h-36 w-52 flex-col items-center justify-center gap-4 rounded-[1.25rem] border border-white/70 bg-[#070b13]/95 px-5 py-5 text-center text-white shadow-2xl sm:min-h-44 sm:w-76 sm:px-6">
            <span className="text-sm font-semibold sm:text-base">Sua aula já começou</span>
            <IconVolumeMuted className="h-12 w-12 sm:h-14 sm:w-14" />
            <span className="text-sm font-semibold sm:text-base">Clique para ouvir</span>
          </span>
        </button>
      )}

      {isYouTube && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
      )}

      <div
        className={`pointer-events-auto absolute z-20 flex items-center ${
          isYouTube
            ? "inset-x-3 bottom-2 gap-3 text-white sm:inset-x-4 sm:bottom-3"
            : "bottom-3 right-3 gap-2 rounded-full bg-black/65 px-3 py-2 text-white backdrop-blur-sm"
        }`}
      >
        {isYouTube && (
          <div className="absolute inset-x-0 -top-3 h-1 overflow-hidden rounded-full bg-white/35">
            <span className="block h-full room-accent-bg" style={{ width: `${progress}%` }} />
          </div>
        )}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Ativar som" : "Silenciar"}
          className="flex h-7 w-7 items-center justify-center text-white transition hover:scale-105"
        >
          {muted || volume === 0 ? <IconVolumeMuted className="h-5 w-5" /> : <IconVolumeOn />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className={`${isYouTube ? "hidden w-16 sm:block" : "w-20"} h-1 accent-white`}
          aria-label="Volume"
        />
        {isYouTube && (
          <>
            <span className="text-[11px] font-medium tabular-nums sm:text-xs">
              {formatPlayerTime(currentTime)} / {formatPlayerTime(videoDurationSeconds)}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Tela cheia"
              className="flex h-7 w-7 items-center justify-center transition hover:scale-105"
            >
              <IconFullscreen />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function formatPlayerTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function IconVolumeOn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <path d="M16.5 12c0-1.77-.77-3.29-2-4.24v8.48c1.23-.95 2-2.47 2-4.24z" />
    </svg>
  );
}

function IconVolumeMuted({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <path d="M19.8 12l2.2-2.2-1.4-1.4L18.4 10.6l-2.2-2.2-1.4 1.4 2.2 2.2-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2 1.4-1.4z" />
    </svg>
  );
}

function IconBroadcast() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15" />
    </svg>
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

function IconFullscreen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    </svg>
  );
}
