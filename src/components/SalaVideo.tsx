"use client";

import { useEffect, useRef, useState } from "react";
import { getElapsedSeconds } from "@/lib/scheduling";
import type { YouTubePlayer } from "@/lib/youtubePlayerTypes";

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
  // Reporta o tempo atual do player pro componente pai a cada tick. Usado
  // pra decidir quando o chat/CTA devem aparecer quando a sincronizacao
  // esta desligada (nesse caso eles seguem o tempo do video, nao o relogio).
  onVideoTimeChange: (seconds: number) => void;
};

export function SalaVideo({ videoId, sessionStart, sincronizarComHorario, onVideoTimeChange }: SalaVideoProps) {
  // Navegadores bloqueiam autoplay COM SOM sem gesto previo do usuario.
  // Pra garantir que o autoplay sempre funcione (essencial pro efeito de
  // "ao vivo"), o player sempre comeca mudo (mute:1) e mostramos um prompt
  // clicavel "ativar som" - o clique conta como gesto do usuario e libera
  // o audio a partir dali.
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const onVideoTimeChangeRef = useRef(onVideoTimeChange);
  onVideoTimeChangeRef.current = onVideoTimeChange;

  useEffect(() => {
    let destroyed = false;

    loadYouTubeApiOnce().then(() => {
      if (destroyed) return;

      const player = new window.YT.Player("youtube-player-target", {
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
      if (typeof current === "number") onVideoTimeChangeRef.current(current);
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

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {/* pointer-events-none bloqueia qualquer clique/toque/scroll no
          iframe do YouTube (inclusive botao direito), impedindo o
          espectador de interagir com o player por fora do nosso codigo */}
      <div className="pointer-events-none h-full w-full">
        <div id="youtube-player-target" className="h-full w-full" />
      </div>

      {showUnmutePrompt && (
        <button
          type="button"
          onClick={toggleMute}
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 transition hover:bg-black/50"
        >
          <span className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 shadow-lg">
            <IconVolumeMuted /> Clique para ativar o som
          </span>
        </button>
      )}

      <div className="pointer-events-auto absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Ativar som" : "Silenciar"}
          className="flex h-6 w-6 items-center justify-center text-gray-900 hover:text-white"
        >
          {muted || volume === 0 ? <IconVolumeMuted /> : <IconVolumeOn />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="h-1 w-20 accent-white"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

function IconVolumeOn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <path d="M16.5 12c0-1.77-.77-3.29-2-4.24v8.48c1.23-.95 2-2.47 2-4.24z" />
    </svg>
  );
}

function IconVolumeMuted() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <path d="M19.8 12l2.2-2.2-1.4-1.4L18.4 10.6l-2.2-2.2-1.4 1.4 2.2 2.2-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2 1.4-1.4z" />
    </svg>
  );
}
