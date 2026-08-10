"use client";

import { formatCountdown } from "@/lib/scheduling";

type OfertaBlockProps = {
  ctaTexto: string;
  ctaLink: string;
  pitchTimestampSeconds: number;
  ctaDesaparecerSegundos: number | null;
  elapsedSeconds: number;
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaImagemUrl: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  ctaCountdownMinutos: number | null;
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/**
 * Bloco de oferta: aparece como conteudo normal LOGO ABAIXO do video (e do
 * chat, no layout mobile empilhado), nunca flutuando por cima da tela. Some
 * de novo se ctaDesaparecerSegundos estiver configurado.
 */
export function OfertaBlock({
  ctaTexto,
  ctaLink,
  pitchTimestampSeconds,
  ctaDesaparecerSegundos,
  elapsedSeconds,
  ofertaNome,
  ofertaTitulo,
  ofertaImagemUrl,
  ofertaDescricao,
  precoOriginal,
  precoOferta,
  ctaCountdownMinutos,
}: OfertaBlockProps) {
  const apareceu = elapsedSeconds >= pitchTimestampSeconds;
  const jaSumiu = ctaDesaparecerSegundos != null && elapsedSeconds >= ctaDesaparecerSegundos;
  if (!apareceu || jaSumiu) return null;

  const segundosDesdeOPitch = elapsedSeconds - pitchTimestampSeconds;
  const countdownRestante =
    ctaCountdownMinutos != null ? Math.max(0, ctaCountdownMinutos * 60 - segundosDesdeOPitch) : null;

  function handleClick() {
    window.fbq?.("track", "Lead");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-center">
        {ofertaImagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ofertaImagemUrl}
            alt=""
            className="max-h-56 w-auto rounded-lg object-cover"
          />
        )}

        {ofertaNome && (
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{ofertaNome}</p>
        )}

        {ofertaTitulo && <h2 className="text-xl font-bold text-gray-900">{ofertaTitulo}</h2>}

        {ofertaDescricao && <p className="text-sm font-medium text-amber-600">{ofertaDescricao}</p>}

        {(precoOriginal != null || precoOferta != null) && (
          <p className="text-base">
            {precoOriginal != null && (
              <span className="mr-2 text-gray-500 line-through">{formatBRL(precoOriginal)}</span>
            )}
            {precoOferta != null && <span className="font-semibold text-emerald-600">{formatBRL(precoOferta)}</span>}
          </p>
        )}

        <a
          href={ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="w-full max-w-sm animate-pulse rounded-full bg-emerald-500 px-8 py-3 text-center text-base font-semibold text-neutral-950 shadow-lg shadow-emerald-500/30 transition hover:animate-none hover:bg-emerald-400"
        >
          {ctaTexto}
        </a>

        {countdownRestante !== null && (
          // suppressHydrationWarning: e um relogio ao vivo - o segundo
          // calculado no servidor e no cliente pode divergir por ~1s
          // (latencia de rede), o que e esperado e nao um bug de verdade.
          <p className="text-[11px] font-medium text-red-600" suppressHydrationWarning>
            Oferta expira em {formatCountdown(countdownRestante)}
          </p>
        )}
      </div>
    </div>
  );
}
