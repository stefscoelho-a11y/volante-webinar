"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { detectarFormato, lerSegmentos, parseLegenda } from "@/lib/legendas";
import { ErroGeracaoRoteiro, gerarRoteiro, type DensidadeChat, type RoteiroGerado } from "@/lib/roteiroIA";

type ChatScriptItem = {
  timestampSegundos: number;
  nomeAutor: string;
  texto: string;
  tipo: string;
};

export async function saveChatScript(webinarId: string, formData: FormData) {
  const raw = String(formData.get("mensagens") ?? "[]");

  let items: ChatScriptItem[];
  try {
    items = JSON.parse(raw);
  } catch {
    throw new Error("Roteiro invalido.");
  }

  // Substituicao total: mais simples e menos propenso a erro do que
  // sincronizar create/update/delete individualmente por linha, e o roteiro
  // inteiro sempre cabe numa unica edicao no admin.
  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { webinarId } }),
    prisma.chatMessage.createMany({
      data: items
        .filter((item) => String(item.texto ?? "").trim().length > 0)
        .map((item, index) => ({
          webinarId,
          timestampSegundos: Math.max(0, Math.floor(Number(item.timestampSegundos) || 0)),
          nomeAutor: String(item.nomeAutor ?? "").trim() || "Anonimo",
          texto: String(item.texto ?? "").trim(),
          tipo: item.tipo === "sistema" ? "sistema" : "mensagem",
          ordem: index,
        })),
    }),
  ]);

  revalidatePath(`/admin/webinars/${webinarId}/chat`);
}

// ---------------------------------------------------------------------------
// Transcricao (legenda) + geracao do roteiro com IA
// ---------------------------------------------------------------------------

// Server actions aceitam no maximo 1MB de body por padrao (contando o
// overhead do multipart). Uma legenda de 3h de video fica em torno de 400KB.
const TAMANHO_MAXIMO_LEGENDA_BYTES = 900 * 1024;

const DENSIDADES_VALIDAS: DensidadeChat[] = ["baixa", "media", "alta"];

export type ResultadoTranscricao = { ok: true } | { ok: false; erro: string };

export async function salvarTranscricao(webinarId: string, formData: FormData): Promise<ResultadoTranscricao> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Selecione um arquivo .srt ou .vtt." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_LEGENDA_BYTES) {
    return { ok: false, erro: "Arquivo muito grande (máximo de 900 KB)." };
  }

  const conteudo = await arquivo.text();
  const formato = detectarFormato(arquivo.name, conteudo);
  if (!formato) {
    return { ok: false, erro: "Formato não suportado. Envie um arquivo .srt ou .vtt." };
  }

  const segmentos = parseLegenda(conteudo);
  if (segmentos.length === 0) {
    return { ok: false, erro: "Não encontrei nenhum trecho com tempo nesse arquivo." };
  }

  await prisma.transcricao.upsert({
    where: { webinarId },
    create: { webinarId, segmentos, formato, nomeArquivo: arquivo.name },
    update: { segmentos, formato, nomeArquivo: arquivo.name },
  });

  revalidatePath(`/admin/webinars/${webinarId}/chat`);
  return { ok: true };
}

export async function removerTranscricao(webinarId: string) {
  await prisma.transcricao.deleteMany({ where: { webinarId } });
  revalidatePath(`/admin/webinars/${webinarId}/chat`);
}

export type ResultadoGeracaoRoteiro = ({ ok: true } & RoteiroGerado) | { ok: false; erro: string };

export async function gerarRoteiroComIA(
  webinarId: string,
  opcoes: { densidade: DensidadeChat; instrucoes: string },
): Promise<ResultadoGeracaoRoteiro> {
  const webinar = await prisma.webinar.findUnique({ where: { id: webinarId }, include: { transcricao: true } });
  if (!webinar) return { ok: false, erro: "Webinário não encontrado." };

  const segmentos = lerSegmentos(webinar.transcricao?.segmentos);
  if (segmentos.length === 0) {
    return { ok: false, erro: "Envie a legenda do vídeo (.srt ou .vtt) antes de gerar o roteiro." };
  }

  try {
    const roteiro = await gerarRoteiro({
      segmentos,
      webinar: {
        titulo: webinar.titulo,
        ofertaNome: webinar.ofertaNome,
        ofertaTitulo: webinar.ofertaTitulo,
        ofertaDescricao: webinar.ofertaDescricao,
        precoOriginal: webinar.precoOriginal,
        precoOferta: webinar.precoOferta,
        ctaTexto: webinar.ctaTexto,
      },
      densidade: DENSIDADES_VALIDAS.includes(opcoes.densidade) ? opcoes.densidade : "media",
      instrucoes: String(opcoes.instrucoes ?? "").slice(0, 2000),
    });
    return { ok: true, ...roteiro };
  } catch (erro) {
    if (erro instanceof ErroGeracaoRoteiro) return { ok: false, erro: erro.message };
    console.error("Falha ao gerar roteiro com IA", erro);
    return { ok: false, erro: "Falha inesperada ao gerar o roteiro. Veja o log do servidor." };
  }
}

export async function aplicarPitchDetectado(webinarId: string, segundos: number) {
  await prisma.webinar.update({
    where: { id: webinarId },
    data: { pitchTimestampSeconds: Math.max(0, Math.floor(Number(segundos) || 0)) },
  });
  revalidatePath(`/admin/webinars/${webinarId}/chat`);
  revalidatePath(`/admin/webinars/${webinarId}/editar`);
}
