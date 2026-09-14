"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { entrarComoConvidado, entrarNoChat, enviarComentario } from "@/app/[slug]/actions";
import {
  INTERVALO_SYNC_MS,
  INTERVALO_SYNC_OCULTO_MS,
  type ChatAoVivoConfig,
  type ComentarioAoVivo,
  type ParticipanteChat,
} from "@/lib/chatAoVivo";

const CHAVE_VISITANTE = "vw_visitante";
// Margem no cursor: um comentario gravado durante a consulta nao se perde
// (os repetidos sao descartados pelo id)
const MARGEM_CURSOR_MS = 10_000;

function obterVisitanteId(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_VISITANTE);
    if (salvo) return salvo;
    const novo = crypto.randomUUID();
    localStorage.setItem(CHAVE_VISITANTE, novo);
    return novo;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Chat real da sala: sinal de presenca, comentarios do participante e
 * respostas do suporte. Sem config (preview do admin, sala teste) fica
 * desligado e o chat e so o roteiro.
 */
export function useChatAoVivo(config: ChatAoVivoConfig | undefined, videoSegundos: number) {
  const [participante, setParticipante] = useState<ParticipanteChat | null>(config?.participante ?? null);
  const [comentarios, setComentarios] = useState<ComentarioAoVivo[]>([]);
  const videoSegundosRef = useRef(videoSegundos);

  useEffect(() => {
    videoSegundosRef.current = videoSegundos;
  }, [videoSegundos]);

  const adicionarComentarios = useCallback((novos: ComentarioAoVivo[]) => {
    if (novos.length === 0) return;
    setComentarios((atuais) => {
      const ids = new Set(atuais.map((comentario) => comentario.id));
      const inéditos = novos.filter((comentario) => !ids.has(comentario.id));
      return inéditos.length > 0 ? [...atuais, ...inéditos] : atuais;
    });
  }, []);

  const webinarId = config?.webinarId;
  const pagina = config?.pagina;
  const sessao = config?.sessao;

  useEffect(() => {
    if (!webinarId || !pagina || !sessao) return;
    const visitanteId = obterVisitanteId();
    let cancelado = false;
    let timeout: number | undefined;
    let desde: string | null = null;

    async function sincronizar() {
      try {
        const resposta = await fetch("/api/sala/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ webinarId, visitanteId, pagina, sessao, videoSegundos: videoSegundosRef.current, desde }),
        });
        if (resposta.ok && !cancelado) {
          const dados = (await resposta.json()) as {
            comentarios: ComentarioAoVivo[];
            participante: ParticipanteChat | null;
          };
          adicionarComentarios(dados.comentarios);
          if (dados.participante) setParticipante(dados.participante);
          const ultimo = dados.comentarios.at(-1);
          if (ultimo) desde = new Date(Date.parse(ultimo.criadoEm) - MARGEM_CURSOR_MS).toISOString();
        }
      } catch {
        // Rede instavel: tenta de novo no proximo ciclo
      }
      if (!cancelado) {
        timeout = window.setTimeout(sincronizar, document.hidden ? INTERVALO_SYNC_OCULTO_MS : INTERVALO_SYNC_MS);
      }
    }

    // Aba fechada: avisa na hora, pra pessoa sair do "assistindo agora" sem esperar o sinal expirar
    function avisarSaida() {
      const corpo = JSON.stringify({ webinarId, visitanteId, pagina, sessao, saindo: true });
      navigator.sendBeacon("/api/sala/sync", new Blob([corpo], { type: "application/json" }));
    }

    window.addEventListener("pagehide", avisarSaida);
    sincronizar();
    return () => {
      cancelado = true;
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", avisarSaida);
    };
  }, [webinarId, pagina, sessao, adicionarComentarios]);

  async function entrar(formData: FormData): Promise<string | null> {
    if (!config) return "Chat indisponível.";
    const resultado = await entrarNoChat(config.webinarId, formData);
    if (!resultado.ok) return resultado.erro;
    setParticipante(resultado.participante);
    return null;
  }

  async function entrarSemDados(): Promise<string | null> {
    if (!config) return "Chat indisponível.";
    const resultado = await entrarComoConvidado(config.webinarId);
    if (!resultado.ok) return resultado.erro;
    setParticipante(resultado.participante);
    return null;
  }

  async function comentar(texto: string): Promise<string | null> {
    if (!config) return "Chat indisponível.";
    const resultado = await enviarComentario(config.webinarId, {
      texto,
      sessao: config.sessao,
      videoSegundos: Math.floor(videoSegundosRef.current),
    });
    if (!resultado.ok) return resultado.erro;
    adicionarComentarios([resultado.comentario]);
    return null;
  }

  return {
    habilitado: Boolean(config),
    participante,
    comentarios,
    entrar,
    entrarComoConvidado: entrarSemDados,
    comentar,
  };
}

export type ChatAoVivo = ReturnType<typeof useChatAoVivo>;
