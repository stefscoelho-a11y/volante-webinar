import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Lead, Webinar } from "@/generated/prisma/client";
import { getElapsedSeconds, getJustInTimeSessionStart, isSessaoEncerrada } from "@/lib/scheduling";
import {
  justInTimeDisponivel,
  lerDadosParticipante,
  paramsParaQuery,
  salaJustInTimePath,
  webinarPath,
  type DadosParticipante,
  type OrigemLead,
  type ViaEntrada,
} from "@/lib/linksAcesso";
import { ORIGEM_CONVIDADO, type ParticipanteChat } from "@/lib/chatAoVivo";

/**
 * Identificacao do participante nas paginas publicas (so servidor). O lead e
 * reconhecido pelo token de acesso: vindo da URL (?a=, funciona em outro
 * aparelho) ou do cookie gravado no cadastro. A sessao just in time sai do
 * banco - nenhum horario vindo da URL e aceito.
 */

const NOVENTA_DIAS_SEGUNDOS = 60 * 60 * 24 * 90;

export const COOKIE_LEAD_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: NOVENTA_DIAS_SEGUNDOS,
};

export function nomeCookieLead(webinarId: string): string {
  return `vw_lead_${webinarId}`;
}

export async function getLeadAtual(webinarId: string, token?: string | null): Promise<Lead | null> {
  const valor = token?.trim() || (await cookies()).get(nomeCookieLead(webinarId))?.value;
  if (!valor) return null;
  const lead = await prisma.lead.findUnique({ where: { tokenAcesso: valor } });
  return lead?.webinarId === webinarId ? lead : null;
}

/** So funciona em Server Action ou Route Handler, onde o cookie pode ser gravado. */
export async function salvarCookieLead(lead: Lead): Promise<void> {
  (await cookies()).set(nomeCookieLead(lead.webinarId), lead.tokenAcesso, COOKIE_LEAD_OPTIONS);
}

/**
 * Cadastra o participante ou reaproveita o cadastro do mesmo email nesse
 * webinar. Origem e UTMs ficam com o primeiro acesso (first touch).
 */
export async function registrarLead(webinarId: string, dados: DadosParticipante, origem: OrigemLead): Promise<Lead> {
  const existente = await prisma.lead.findFirst({
    where: { webinarId, email: { equals: dados.email, mode: "insensitive" } },
    orderBy: { entrouEm: "asc" },
  });

  if (!existente) {
    return prisma.lead.create({
      data: { ...dados, webinarId, origem, nome: dados.nome ?? dados.email.split("@")[0] },
    });
  }

  return prisma.lead.update({
    where: { id: existente.id },
    data: {
      nome: dados.nome ?? existente.nome,
      telefone: dados.telefone ?? existente.telefone,
      utmSource: existente.utmSource ?? dados.utmSource,
      utmMedium: existente.utmMedium ?? dados.utmMedium,
      utmCampaign: existente.utmCampaign ?? dados.utmCampaign,
      utmContent: existente.utmContent ?? dados.utmContent,
      utmTerm: existente.utmTerm ?? dados.utmTerm,
    },
  });
}

/** Sessao do participante ainda aguardando ou ao vivo. */
export function sessaoJustInTimeAtiva(lead: Lead, videoDurationSeconds: number, now: Date = new Date()): boolean {
  if (!lead.sessaoEscolhida) return false;
  return !isSessaoEncerrada(getElapsedSeconds(lead.sessaoEscolhida, now), videoDurationSeconds);
}

/** Mantem a sessao just in time em andamento ou abre uma nova (agora + delay). */
async function garantirSessaoJustInTime(lead: Lead, webinar: Webinar): Promise<Lead> {
  if (sessaoJustInTimeAtiva(lead, webinar.videoDurationSeconds)) return lead;
  return prisma.lead.update({
    where: { id: lead.id },
    data: { sessaoEscolhida: getJustInTimeSessionStart(new Date(), webinar.delayJustInTimeMinutos ?? 0) },
  });
}

/**
 * Entrada de um participante identificado - pelo formulario de cadastro ou
 * por um magic link. Registra o lead e diz pra onde ele segue.
 */
export async function registrarEntrada(
  webinar: Webinar,
  dados: DadosParticipante,
  viaSolicitada: string | null,
  magicLink: boolean,
): Promise<{ lead: Lead; destino: string }> {
  // Link just in time com o just in time desligado cai no fluxo da sala principal
  const via: ViaEntrada =
    viaSolicitada === "replay" ? "replay" : viaSolicitada === "jit" && justInTimeDisponivel(webinar) ? "jit" : "principal";
  const justInTime = via === "jit" || (via === "principal" && webinar.tipoAgendamento === "just_in_time");

  const origem: OrigemLead =
    via === "replay"
      ? "replay"
      : via === "jit"
        ? magicLink
          ? "just_in_time_magic"
          : "just_in_time"
        : magicLink
          ? "magic_link"
          : "principal";

  let lead = await registrarLead(webinar.id, dados, origem);
  if (justInTime) lead = await garantirSessaoJustInTime(lead, webinar);

  const destino = justInTime
    ? salaJustInTimePath(webinar.slug, lead.tokenAcesso)
    : via === "replay"
      ? webinarPath(webinar.slug, "replay")
      : webinarPath(webinar.slug);

  return { lead, destino };
}

/**
 * Pagina de entrada aberta com dados do participante na URL (magic link):
 * manda pro /entrar, que cadastra, grava o cookie e redireciona pra uma URL
 * limpa - assim nome e email nunca chegam na sala (nem no Meta Pixel).
 */
export function redirecionarSeMagicLink(
  slug: string,
  via: ViaEntrada,
  params: Record<string, string | string[] | undefined>,
): void {
  if (!lerDadosParticipante(params)) return;
  redirect(webinarPath(slug, "entrar", { ...paramsParaQuery(params), via }));
}

/** Convidado do chat nao conta como cadastro (ex: webinar com "exigir cadastro"). */
export function leadCadastrado(lead: Lead | null): lead is Lead {
  return lead !== null && lead.origem !== ORIGEM_CONVIDADO;
}

export function participanteDoChat(lead: Lead | null): ParticipanteChat | null {
  return lead ? { nome: lead.nome, convidado: lead.origem === ORIGEM_CONVIDADO } : null;
}

/**
 * Entrada no chat com nome e WhatsApp. Um convidado que decide se
 * identificar vira cadastro sem perder os comentarios que ja fez. Nao
 * reaproveita cadastro de outro navegador pelo numero: quem digitasse o
 * WhatsApp de outra pessoa veria os comentarios e respostas dela.
 */
export async function registrarParticipanteChat(
  webinarId: string,
  nome: string,
  whatsapp: string,
  atual: Lead | null,
): Promise<Lead> {
  if (atual && (atual.origem === ORIGEM_CONVIDADO || atual.telefone === whatsapp)) {
    return prisma.lead.update({
      where: { id: atual.id },
      data: { nome, telefone: whatsapp, origem: atual.origem === ORIGEM_CONVIDADO ? "chat" : atual.origem },
    });
  }
  return prisma.lead.create({ data: { webinarId, nome, telefone: whatsapp, origem: "chat" } });
}

/** Entrada no chat sem dados: aparece como "Convidado 1234". */
export async function registrarConvidado(webinarId: string): Promise<Lead> {
  const numero = 1000 + Math.floor(Math.random() * 9000);
  return prisma.lead.create({ data: { webinarId, nome: `Convidado ${numero}`, origem: ORIGEM_CONVIDADO } });
}
