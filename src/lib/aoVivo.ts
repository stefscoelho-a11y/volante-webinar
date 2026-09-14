import { prisma } from "@/lib/prisma";
import {
  MAX_COMENTARIO,
  NOME_SUPORTE_PADRAO,
  ONLINE_ATE_SEGUNDOS,
  ORIGEM_CONVIDADO,
  type DadosAoVivo,
} from "@/lib/chatAoVivo";

/**
 * Painel Ao vivo (so servidor): leitura de presenca/comentarios e resposta do
 * suporte. Sem checagem de login aqui - quem chama (action/rota do admin, ou
 * o suporte automatico com IA no futuro) decide quem pode.
 */

const MAX_ESPECTADORES_LISTADOS = 500;
const MAX_COMENTARIOS = 100;

export async function carregarDadosAoVivo(webinarId: string): Promise<DadosAoVivo> {
  const agora = new Date();
  const online = { webinarId, ultimoSinal: { gt: new Date(agora.getTime() - ONLINE_ATE_SEGUNDOS * 1000) } };

  const [totalAssistindo, presencas, comentarios] = await Promise.all([
    prisma.presenca.count({ where: online }),
    prisma.presenca.findMany({
      where: online,
      orderBy: { entrouEm: "asc" },
      take: MAX_ESPECTADORES_LISTADOS,
      select: {
        visitanteId: true,
        pagina: true,
        videoSegundos: true,
        entrouEm: true,
        lead: { select: { nome: true, email: true, telefone: true, origem: true } },
      },
    }),
    prisma.comentario.findMany({
      where: { webinarId, tipo: "participante" },
      orderBy: { criadoEm: "desc" },
      take: MAX_COMENTARIOS,
      select: {
        id: true,
        nomeAutor: true,
        texto: true,
        videoSegundos: true,
        sessao: true,
        criadoEm: true,
        lead: { select: { email: true, telefone: true, origem: true } },
        respostas: {
          orderBy: { criadoEm: "asc" },
          select: { id: true, nomeAutor: true, texto: true, criadoEm: true },
        },
      },
    }),
  ]);

  return {
    agora: agora.toISOString(),
    totalAssistindo,
    assistindo: presencas.map((presenca) => ({
      visitanteId: presenca.visitanteId,
      nome: presenca.lead?.nome ?? null,
      email: presenca.lead?.email ?? null,
      whatsapp: presenca.lead?.telefone ?? null,
      convidado: presenca.lead?.origem === ORIGEM_CONVIDADO,
      pagina: presenca.pagina === "replay" ? "replay" : "sala",
      videoSegundos: presenca.videoSegundos,
      entrouEm: presenca.entrouEm.toISOString(),
    })),
    comentarios: comentarios.map((comentario) => ({
      id: comentario.id,
      nomeAutor: comentario.nomeAutor,
      email: comentario.lead.email,
      whatsapp: comentario.lead.telefone,
      convidado: comentario.lead.origem === ORIGEM_CONVIDADO,
      texto: comentario.texto,
      videoSegundos: comentario.videoSegundos,
      pagina: comentario.sessao === "replay" ? "replay" : "sala",
      criadoEm: comentario.criadoEm.toISOString(),
      respostas: comentario.respostas.map((resposta) => ({ ...resposta, criadoEm: resposta.criadoEm.toISOString() })),
    })),
  };
}

/** Quantas pessoas estao com a sala aberta agora, por webinar (lista do admin). */
export async function contarAssistindoPorWebinar(webinarIds: string[]): Promise<Map<string, number>> {
  if (webinarIds.length === 0) return new Map();
  const grupos = await prisma.presenca.groupBy({
    by: ["webinarId"],
    where: {
      webinarId: { in: webinarIds },
      ultimoSinal: { gt: new Date(Date.now() - ONLINE_ATE_SEGUNDOS * 1000) },
    },
    _count: { _all: true },
  });
  return new Map(grupos.map((grupo) => [grupo.webinarId, grupo._count._all]));
}

export type ResultadoResposta = { ok: true } | { ok: false; erro: string };

/** Resposta do suporte a um comentario. Aparece so pro participante que comentou. */
export async function responderComoSuporte(comentarioId: string, texto: string): Promise<ResultadoResposta> {
  const resposta = String(texto ?? "").trim().slice(0, MAX_COMENTARIO);
  if (!resposta) return { ok: false, erro: "Escreva a resposta." };

  const original = await prisma.comentario.findUnique({ where: { id: comentarioId } });
  if (!original || original.tipo !== "participante") return { ok: false, erro: "Comentário não encontrado." };

  const agora = new Date();
  // Posiciona a resposta na timeline do participante: o ponto em que ele
  // comentou mais o tempo que o suporte levou pra responder.
  const atrasoSegundos = Math.max(0, Math.round((agora.getTime() - original.criadoEm.getTime()) / 1000));

  await prisma.comentario.create({
    data: {
      webinarId: original.webinarId,
      leadId: original.leadId,
      tipo: "suporte",
      nomeAutor: NOME_SUPORTE_PADRAO,
      texto: resposta,
      sessao: original.sessao,
      videoSegundos: original.videoSegundos + atrasoSegundos,
      respondeAId: original.id,
      criadoEm: agora,
    },
  });

  return { ok: true };
}
