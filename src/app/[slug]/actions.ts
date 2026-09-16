"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lerDadosParticipante } from "@/lib/linksAcesso";
import { lerCanalDaQuery } from "@/lib/canaisOferta";
import {
  getLeadAtual,
  participanteDoChat,
  registrarConvidado,
  registrarEntrada,
  registrarParticipanteChat,
  salvarCookieLead,
} from "@/lib/leads";
import {
  MAX_COMENTARIO,
  normalizarWhatsapp,
  type ComentarioAoVivo,
  type ParticipanteChat,
} from "@/lib/chatAoVivo";

// Evita flood: no maximo um comentario a cada 2 segundos por participante
const INTERVALO_MINIMO_COMENTARIO_MS = 2000;

function camposDoFormulario(formData: FormData): Record<string, string> {
  const campos: Record<string, string> = {};
  formData.forEach((valor, chave) => {
    if (typeof valor === "string") campos[chave] = valor;
  });
  return campos;
}

/**
 * Formulario de cadastro das paginas de entrada (sala principal, just in
 * time e replay). O webinar e relido do banco: delay e horarios nunca vem do
 * navegador.
 */
export async function cadastrar(slug: string, via: string, formData: FormData) {
  const webinar = await prisma.webinar.findUnique({ where: { slug } });
  if (!webinar || !webinar.ativo) throw new Error("Webinário não encontrado.");

  const campos = camposDoFormulario(formData);
  const dados = lerDadosParticipante(campos);
  if (!dados) throw new Error("Preencha nome e um email válido.");

  const { lead, destino } = await registrarEntrada(webinar, dados, via, false, lerCanalDaQuery(campos));
  await salvarCookieLead(lead);
  redirect(destino);
}

export type ResultadoEntrarNoChat = { ok: true; participante: ParticipanteChat } | { ok: false; erro: string };

async function webinarAtivo(webinarId: string): Promise<boolean> {
  const webinar = await prisma.webinar.findUnique({ where: { id: webinarId }, select: { ativo: true } });
  return Boolean(webinar?.ativo);
}

/** Entrada no chat com nome e WhatsApp, sem sair da sala. */
export async function entrarNoChat(webinarId: string, formData: FormData): Promise<ResultadoEntrarNoChat> {
  if (!(await webinarAtivo(webinarId))) return { ok: false, erro: "Este webinário não está disponível." };

  const nome = String(formData.get("nome") ?? "").trim().slice(0, 120);
  const whatsapp = normalizarWhatsapp(String(formData.get("whatsapp") ?? ""));
  if (!nome) return { ok: false, erro: "Informe seu nome." };
  if (!whatsapp) return { ok: false, erro: "Informe um WhatsApp válido, com DDD." };

  const lead = await registrarParticipanteChat(webinarId, nome, whatsapp, await getLeadAtual(webinarId));
  await salvarCookieLead(lead);
  return { ok: true, participante: { nome: lead.nome, convidado: false } };
}

/** Entrada no chat sem informar dados. */
export async function entrarComoConvidado(webinarId: string): Promise<ResultadoEntrarNoChat> {
  if (!(await webinarAtivo(webinarId))) return { ok: false, erro: "Este webinário não está disponível." };

  const lead = (await getLeadAtual(webinarId)) ?? (await registrarConvidado(webinarId));
  await salvarCookieLead(lead);
  return { ok: true, participante: participanteDoChat(lead)! };
}

export type ResultadoComentario = { ok: true; comentario: ComentarioAoVivo } | { ok: false; erro: string };

export async function enviarComentario(
  webinarId: string,
  dados: { texto: string; sessao: string; videoSegundos: number },
): Promise<ResultadoComentario> {
  const lead = await getLeadAtual(webinarId);
  if (!lead) return { ok: false, erro: "Entre no chat com seu nome antes de comentar." };

  const texto = String(dados.texto ?? "").trim().slice(0, MAX_COMENTARIO);
  const sessao = String(dados.sessao ?? "").slice(0, 40);
  if (!texto) return { ok: false, erro: "Escreva um comentário." };
  if (!sessao) return { ok: false, erro: "Sessão inválida. Recarregue a página." };

  const ultimo = await prisma.comentario.findFirst({
    where: { leadId: lead.id, tipo: "participante" },
    orderBy: { criadoEm: "desc" },
    select: { criadoEm: true },
  });
  if (ultimo && Date.now() - ultimo.criadoEm.getTime() < INTERVALO_MINIMO_COMENTARIO_MS) {
    return { ok: false, erro: "Espere um instante antes de comentar de novo." };
  }

  const comentario = await prisma.comentario.create({
    data: {
      webinarId,
      leadId: lead.id,
      tipo: "participante",
      nomeAutor: lead.nome,
      texto,
      sessao,
      videoSegundos: Math.max(0, Math.floor(Number(dados.videoSegundos) || 0)),
    },
    select: { id: true, nomeAutor: true, texto: true, videoSegundos: true, criadoEm: true },
  });

  return { ok: true, comentario: { ...comentario, tipo: "participante", criadoEm: comentario.criadoEm.toISOString() } };
}
