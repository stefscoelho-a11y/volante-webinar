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
  precoParcelado: string | null;
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
  precoParcelado,
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
    <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-2 sm:py-8">
      <div className="room-surface flex flex-col items-center gap-3 rounded-2xl border p-6 text-center shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        {ofertaImagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ofertaImagemUrl}
            alt={ofertaTitulo ? `Imagem da oferta ${ofertaTitulo}` : "Imagem da oferta do webinar"}
            className="max-h-56 w-auto rounded-lg object-cover"
          />
        )}

        {ofertaNome && (
          <p className="room-accent-text text-xs font-semibold uppercase tracking-wide">{ofertaNome}</p>
        )}

        {ofertaTitulo && <h2 className="text-xl font-bold">{ofertaTitulo}</h2>}

        {ofertaDescricao && <p className="room-accent-text text-sm font-medium">{ofertaDescricao}</p>}

        {(precoOriginal != null || precoOferta != null) && (
          <p className="text-base">
            {precoOriginal != null && (
              <span className="room-muted mr-2 line-through">{formatBRL(precoOriginal)}</span>
            )}
            {precoOferta != null && <span className="room-accent-text font-semibold">{formatBRL(precoOferta)}</span>}
          </p>
        )}

        {precoParcelado && <p className="room-muted text-sm">ou {precoParcelado}</p>}

        <a
          href={ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="room-accent-bg room-accent-ring w-full max-w-sm rounded-lg px-8 py-3 text-center text-base font-semibold transition duration-200 hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0"
        >
          {ctaTexto}
        </a>

        {countdownRestante !== null && (
          // suppressHydrationWarning: e um relogio ao vivo - o segundo
          // calculado no servidor e no cliente pode divergir por ~1s
          // (latencia de rede), o que e esperado e nao um bug de verdade.
          <p className="room-accent-text text-[11px] font-medium" suppressHydrationWarning>
            Oferta expira em {formatCountdown(countdownRestante)}
          </p>
        )}
      </div>
    </div>
  );
}
