"use client";

import { useState } from "react";
import { SalaRoom } from "@/components/SalaRoom";
import type { ChatMessageData } from "@/components/ChatPanel";

type AdminPreviewProps = {
  webinarId: string;
  titulo: string;
  videoId: string;
  videoDurationSeconds: number;
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
};

function computeSessionStartIso(elapsedSeconds: number): string {
  return new Date(Date.now() - elapsedSeconds * 1000).toISOString();
}

export function AdminPreview({
  webinarId,
  titulo,
  videoId,
  videoDurationSeconds,
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
}: AdminPreviewProps) {
  const [manualElapsed, setManualElapsed] = useState(0);
  const [sessionStartIso, setSessionStartIso] = useState(() => computeSessionStartIso(0));
  // Muda a cada "Ir" clicado, forcando o SalaRoom a remontar do zero (via
  // key) mesmo se o valor em segundos for o mesmo de antes.
  const [nonce, setNonce] = useState(0);

  function applyElapsed(elapsedSeconds: number) {
    const clamped = Math.max(0, Math.min(elapsedSeconds, videoDurationSeconds - 1));
    setManualElapsed(clamped);
    setSessionStartIso(computeSessionStartIso(clamped));
    setNonce((n) => n + 1);
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white p-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Ir para o segundo:</span>
          <input
            type="number"
            min={0}
            max={videoDurationSeconds}
            value={manualElapsed}
            onChange={(e) => setManualElapsed(Number(e.target.value))}
            className="w-24 rounded border border-gray-300 bg-gray-100 px-2 py-1 text-sm text-gray-900"
          />
          <button
            type="button"
            onClick={() => applyElapsed(manualElapsed)}
            className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            Ir
          </button>
          <span className="mx-1 text-gray-500">|</span>
          <button type="button" onClick={() => applyElapsed(0)} className="text-sm text-gray-500 hover:text-gray-800">
            Inicio
          </button>
          <button
            type="button"
            onClick={() => applyElapsed(Math.max(0, pitchTimestampSeconds - 5))}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Antes do CTA
          </button>
          <button
            type="button"
            onClick={() => applyElapsed(pitchTimestampSeconds)}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            No CTA
          </button>
          <button
            type="button"
            onClick={() => applyElapsed(Math.max(0, videoDurationSeconds - 10))}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Perto do fim
          </button>
        </div>
      </div>

      <SalaRoom
        key={nonce}
        webinarId={webinarId}
        titulo={titulo}
        videoId={videoId}
        videoDurationSeconds={videoDurationSeconds}
        sessionStartIso={sessionStartIso}
        jaEncerradoNoCarregamento={false}
        sincronizarVideoComHorario={sincronizarVideoComHorario}
        ctaTexto={ctaTexto}
        ctaLink={ctaLink}
        pitchTimestampSeconds={pitchTimestampSeconds}
        ctaDesaparecerSegundos={ctaDesaparecerSegundos}
        ofertaNome={ofertaNome}
        ofertaTitulo={ofertaTitulo}
        ofertaImagemUrl={ofertaImagemUrl}
        ofertaDescricao={ofertaDescricao}
        precoOriginal={precoOriginal}
        precoOferta={precoOferta}
        ctaCountdownMinutos={ctaCountdownMinutos}
        metaPixelId={metaPixelId}
        audienciaFakeMin={audienciaFakeMin}
        audienciaFakeMax={audienciaFakeMax}
        chatMessages={chatMessages}
      />
    </div>
  );
}
