"use client";

import { useEffect, useRef } from "react";
import type { YouTubePlayer } from "@/lib/youtubePlayerTypes";

/**
 * Player usado so no admin pra calibrar os tempos do roteiro de chat.
 * Ao contrario do player publico (SalaVideo), aqui os controles nativos do
 * YouTube ficam LIGADOS (controls:1) de proposito: o admin precisa poder
 * pausar e arrastar a barra de progresso livremente pra achar o segundo
 * exato de cada mensagem.
 */

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

const POLL_MS = 300;

type AdminVideoScrubberProps = {
  videoId: string;
  onTimeUpdate: (seconds: number) => void;
};

export function AdminVideoScrubber({ videoId, onTimeUpdate }: AdminVideoScrubberProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  useEffect(() => {
    let destroyed = false;

    loadYouTubeApiOnce().then(() => {
      if (destroyed) return;
      const player = new window.YT.Player("admin-scrubber-target", {
        videoId,
        playerVars: { controls: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
          },
        },
      });
    });

    const poll = window.setInterval(() => {
      const current = playerRef.current?.getCurrentTime();
      if (typeof current === "number") onTimeUpdateRef.current(current);
    }, POLL_MS);

    return () => {
      destroyed = true;
      window.clearInterval(poll);
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <div id="admin-scrubber-target" className="h-full w-full" />
    </div>
  );
}
