import { parseTempoHMS } from "@/lib/tempo";

/**
 * Campos da etapa "Oferta": lidos e validados aqui porque dois formularios
 * precisam do mesmo resultado - a criacao do webinario (ainda inline, no
 * wizard) e a pagina /oferta (edicao, onde a oferta e os canais ficam juntos).
 */

export type CamposOfertaFormulario = {
  pitchTimestampSeconds: number;
  ctaTexto: string;
  ctaLink: string;
  ctaDesaparecerSegundos: number | null;
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaImagemUrl: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  // Texto livre, ex: "10x de R$ 19,90"
  precoParcelado: string | null;
  ctaCountdownMinutos: number | null;
};

export function parseOfertaCampos(formData: FormData): CamposOfertaFormulario {
  const pitchTimestampSeconds = parseTempoHMS(String(formData.get("pitchTimestampSeconds") ?? "")) ?? Number.NaN;
  const ctaTexto = String(formData.get("ctaTexto") ?? "").trim();
  const ctaLink = String(formData.get("ctaLink") ?? "").trim();

  const ctaDesaparecerRaw = String(formData.get("ctaDesaparecerSegundos") ?? "").trim();
  const ctaDesaparecerSegundos = ctaDesaparecerRaw ? (parseTempoHMS(ctaDesaparecerRaw) ?? Number.NaN) : null;

  const ofertaNome = String(formData.get("ofertaNome") ?? "").trim() || null;
  const ofertaTitulo = String(formData.get("ofertaTitulo") ?? "").trim() || null;
  const ofertaImagemUrl = String(formData.get("ofertaImagemUrl") ?? "").trim() || null;
  const ofertaDescricao = String(formData.get("ofertaDescricao") ?? "").trim() || null;

  const precoOriginalRaw = String(formData.get("precoOriginal") ?? "").trim();
  const precoOriginal = precoOriginalRaw ? Number(precoOriginalRaw) : null;

  const precoOfertaRaw = String(formData.get("precoOferta") ?? "").trim();
  const precoOferta = precoOfertaRaw ? Number(precoOfertaRaw) : null;

  const precoParcelado = String(formData.get("precoParcelado") ?? "").trim() || null;

  const ctaCountdownRaw = String(formData.get("ctaCountdownMinutos") ?? "").trim();
  const ctaCountdownMinutos = ctaCountdownRaw ? Number(ctaCountdownRaw) : null;

  if (!ctaTexto || !ctaLink) {
    throw new Error("Preencha o texto e o link do botão de CTA.");
  }
  if (!Number.isFinite(pitchTimestampSeconds) || pitchTimestampSeconds < 0) {
    throw new Error("Timestamp em que o CTA aparece é inválido.");
  }
  if (ctaDesaparecerSegundos !== null && Number.isNaN(ctaDesaparecerSegundos)) {
    throw new Error("Tempo em que a oferta some é inválido.");
  }

  return {
    pitchTimestampSeconds,
    ctaTexto,
    ctaLink,
    ctaDesaparecerSegundos,
    ofertaNome,
    ofertaTitulo,
    ofertaImagemUrl,
    ofertaDescricao,
    precoOriginal,
    precoOferta,
    precoParcelado,
    ctaCountdownMinutos,
  };
}
