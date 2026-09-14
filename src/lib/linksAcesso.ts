/**
 * Links publicos de acesso de um webinar: caminhos, tipos de link e leitura
 * dos dados do participante vindos da URL (magic link) ou do cadastro.
 *
 * Hoje as URLs sao por caminho: /{slug}, /{slug}/jit, /{slug}/replay...
 * Pra usar dominio ou subdominio personalizado depois, o ponto de troca e
 * getPublicBaseUrl/webinarPath - telas do admin e redirects montam URL so
 * por aqui. Pode ser importado tanto no servidor quanto no navegador.
 */

// Primeiro segmento da URL que nao pode virar slug de webinar: ja e usado por
// rotas do app ou pelos redirects dos links antigos (/w/...).
export const SLUGS_RESERVADOS = ["admin", "api", "w", "_next", "favicon.ico", "robots.txt", "sitemap.xml"];

export type PaginaWebinar = "sala" | "jit" | "replay" | "teste" | "entrar";

// Pagina de entrada por onde o participante chegou
export type ViaEntrada = "principal" | "jit" | "replay";

export const ORIGENS_LEAD = {
  principal: "Sala principal",
  magic_link: "Magic link",
  just_in_time: "Just in time",
  just_in_time_magic: "Just in time com magic link",
  replay: "Replay",
  chat: "Chat da sala",
  convidado: "Convidado no chat",
} as const;
export type OrigemLead = keyof typeof ORIGENS_LEAD;

export function webinarPath(slug: string, pagina?: PaginaWebinar, query?: Record<string, string>): string {
  const path = pagina ? `/${slug}/${pagina}` : `/${slug}`;
  const queryString = query ? new URLSearchParams(query).toString() : "";
  return queryString ? `${path}?${queryString}` : path;
}

/** Sala de um participante just in time: a sessao vem do lead (token), nunca de um horario na URL. */
export function salaJustInTimePath(slug: string, tokenAcesso: string): string {
  return webinarPath(slug, "sala", { a: tokenAcesso, modo: "jit" });
}

/**
 * Origem dos links copiados no admin. NEXT_PUBLIC_SITE_URL fixa o dominio de
 * producao (o link copiado no localhost ja sai certo); sem ela, usa o
 * endereco em que o admin esta aberto.
 */
export function getPublicBaseUrl(fallbackOrigin: string): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || fallbackOrigin;
}

export function justInTimeDisponivel(webinar: { tipoAgendamento: string; justInTimeAtivo: boolean }): boolean {
  return webinar.tipoAgendamento === "just_in_time" || webinar.justInTimeAtivo;
}

export function textoJustInTime(delayMinutos: number): string {
  return `Cadastre-se e a sala abre em ${delayMinutos} minuto${delayMinutos === 1 ? "" : "s"}.`;
}

// Etiquetas de personalizacao das ferramentas de email mais usadas, pra
// montar o magic link pronto pra colar no disparo.
export const FERRAMENTAS_EMAIL = [
  { key: "generica", label: "Genérica", nome: "{nome}", email: "{email}" },
  { key: "activecampaign", label: "ActiveCampaign", nome: "%FIRSTNAME%", email: "%EMAIL%" },
  { key: "rdstation", label: "RD Station", nome: "{{lead.nome}}", email: "{{lead.email}}" },
  { key: "mailchimp", label: "Mailchimp", nome: "*|FNAME|*", email: "*|EMAIL|*" },
] as const;
export type FerramentaEmail = (typeof FERRAMENTAS_EMAIL)[number];

export function magicLinkQuery(ferramenta: FerramentaEmail): string {
  // Sem encode de proposito: a ferramenta de email precisa achar a etiqueta intacta pra substituir.
  return `nome=${ferramenta.nome}&email=${ferramenta.email}`;
}

export type DadosParticipante = {
  nome: string | null;
  email: string;
  telefone: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

type ParamsBrutos = Record<string, string | string[] | undefined>;

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Etiqueta que a ferramenta de email nao substituiu (ex: preview do disparo)
const ETIQUETA_NAO_SUBSTITUIDA = /[%{}]|\*\|/;
const PARAMS_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function lerParam(params: ParamsBrutos, nomes: string[], max: number): string | null {
  for (const nome of nomes) {
    const bruto = params[nome];
    const valor = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim();
    if (valor && !ETIQUETA_NAO_SUBSTITUIDA.test(valor)) return valor.slice(0, max);
  }
  return null;
}

/**
 * Le nome, email, telefone e UTMs de uma query string ou formulario. Sem um
 * email valido retorna null - e isso que decide se o link entra direto
 * (magic link) ou se a pessoa ainda precisa preencher o cadastro.
 */
export function lerDadosParticipante(params: ParamsBrutos): DadosParticipante | null {
  const email = lerParam(params, ["email"], 200)?.toLowerCase();
  if (!email || !EMAIL_VALIDO.test(email)) return null;
  return {
    nome: lerParam(params, ["nome", "name", "first_name"], 120),
    email,
    telefone: lerParam(params, ["telefone", "phone", "whatsapp"], 40),
    utmSource: lerParam(params, ["utm_source"], 200),
    utmMedium: lerParam(params, ["utm_medium"], 200),
    utmCampaign: lerParam(params, ["utm_campaign"], 200),
    utmContent: lerParam(params, ["utm_content"], 200),
    utmTerm: lerParam(params, ["utm_term"], 200),
  };
}

/** UTMs presentes na URL, repassadas como campos ocultos do cadastro. */
export function lerUtms(params: ParamsBrutos): Record<string, string> {
  const utms: Record<string, string> = {};
  for (const nome of PARAMS_UTM) {
    const valor = lerParam(params, [nome], 200);
    if (valor) utms[nome] = valor;
  }
  return utms;
}

export function paramsParaQuery(params: ParamsBrutos): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [nome, bruto] of Object.entries(params)) {
    const valor = Array.isArray(bruto) ? bruto[0] : bruto;
    if (valor !== undefined) query[nome] = valor;
  }
  return query;
}
