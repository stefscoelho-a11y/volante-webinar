/**
 * Canais de oferta: um webinar pode ter varios canais de venda (ex: "Live
 * trafego", "SMS organico"), cada um com seu proprio link e podendo
 * sobrescrever qualquer campo da oferta (nome, preco, CTA, pixel...).
 *
 * E um sistema separado dos Links de Acesso (src/lib/linksAcesso.ts): links
 * de acesso decidem COMO a pessoa entra na sala (magic link, just in time,
 * replay...), canal de oferta decide QUAL oferta ela ve dentro da sala. Os
 * dois se combinam - todo link de acesso pode levar ?c=<slug> junto.
 *
 * O slug do canal viaja pela URL (?c=) e, assim que um lead e cadastrado,
 * fica gravado nele (first-touch, igual origem/UTMs) - assim continua valendo
 * mesmo depois de redirects que nao repassam query string (ex: recorrente ->
 * /sala) ou em visitas futuras pelo cookie.
 */

const PARAM_CANAL = "c";

export type ParamsBrutos = Record<string, string | string[] | undefined>;

export function lerCanalDaQuery(params: ParamsBrutos): string | null {
  const bruto = params[PARAM_CANAL];
  const valor = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim();
  return valor ? valor.slice(0, 60) : null;
}

/** Pra repassar o canal como campo oculto de um <CadastroForm>, junto das UTMs. */
export function campoOcultoCanal(params: ParamsBrutos): Record<string, string> {
  const canal = lerCanalDaQuery(params);
  return canal ? { [PARAM_CANAL]: canal } : {};
}

/** Pra repassar o canal como query extra num redirect/webinarPath(). */
export function queryCanal(canalSlug: string | null | undefined): Record<string, string> {
  return canalSlug ? { [PARAM_CANAL]: canalSlug } : {};
}

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;
const SLUG_INVALIDO = /[^a-z0-9-]/g;

/** Sugestao de slug a partir do nome do canal, ex: "Live Trafego" -> "live-trafego". */
export function slugificarCanal(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(SLUG_INVALIDO, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export type CamposOferta = {
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaImagemUrl: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  precoParcelado: string | null;
  ctaTexto: string;
  ctaLink: string;
  ctaCountdownMinutos: number | null;
  ctaDesaparecerSegundos: number | null;
  metaPixelId: string | null;
};

export type CanalOfertaOverrides = {
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaImagemUrl: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  precoParcelado: string | null;
  ctaTexto: string | null;
  ctaLink: string | null;
  ctaCountdownMinutos: number | null;
  ctaDesaparecerSegundos: number | null;
  metaPixelId: string | null;
};

/** Mescla os campos do canal sobre os campos base do webinar - nulo no canal = herda do webinar. */
export function resolverOferta(webinarBase: CamposOferta, canal: CanalOfertaOverrides | null): CamposOferta {
  if (!canal) return webinarBase;
  return {
    ofertaNome: canal.ofertaNome ?? webinarBase.ofertaNome,
    ofertaTitulo: canal.ofertaTitulo ?? webinarBase.ofertaTitulo,
    ofertaImagemUrl: canal.ofertaImagemUrl ?? webinarBase.ofertaImagemUrl,
    ofertaDescricao: canal.ofertaDescricao ?? webinarBase.ofertaDescricao,
    precoOriginal: canal.precoOriginal ?? webinarBase.precoOriginal,
    precoOferta: canal.precoOferta ?? webinarBase.precoOferta,
    precoParcelado: canal.precoParcelado ?? webinarBase.precoParcelado,
    ctaTexto: canal.ctaTexto ?? webinarBase.ctaTexto,
    ctaLink: canal.ctaLink ?? webinarBase.ctaLink,
    ctaCountdownMinutos: canal.ctaCountdownMinutos ?? webinarBase.ctaCountdownMinutos,
    ctaDesaparecerSegundos: canal.ctaDesaparecerSegundos ?? webinarBase.ctaDesaparecerSegundos,
    metaPixelId: canal.metaPixelId ?? webinarBase.metaPixelId,
  };
}

/** Acha o canal (pela URL ou, na falta, pelo lead) numa lista ja carregada do webinar. */
export function encontrarCanal<T extends { slug: string }>(
  canais: T[],
  canalDaUrl: string | null,
  canalDoLead: string | null | undefined,
): T | null {
  const slug = canalDaUrl ?? canalDoLead ?? null;
  if (!slug) return null;
  return canais.find((canal) => canal.slug === slug) ?? null;
}
