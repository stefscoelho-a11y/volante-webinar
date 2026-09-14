"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExternalLink, MessageSquare, Radio, Users } from "lucide-react";
import { formatarTempo } from "@/lib/legendas";
import { webinarPath } from "@/lib/linksAcesso";
import {
  MAX_COMENTARIO,
  formatarWhatsapp,
  normalizarWhatsapp,
  type ComentarioPainel,
  type DadosAoVivo,
} from "@/lib/chatAoVivo";
import { responderComentario } from "@/app/admin/ao-vivo/[id]/actions";

const INTERVALO_ATUALIZACAO_MS = 4000;

type PainelAoVivoProps = {
  webinarId: string;
  slug: string;
  ativo: boolean;
};

// Relativo ao relogio do servidor (agora vem junto dos dados): evita erro de
// fuso/relogio do computador do admin.
function haQuanto(iso: string, agoraIso: string): string {
  const segundos = Math.max(0, Math.round((Date.parse(agoraIso) - Date.parse(iso)) / 1000));
  if (segundos < 60) return "agora";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)} h`;
}

export function PainelAoVivo({ webinarId, slug, ativo }: PainelAoVivoProps) {
  const [dados, setDados] = useState<DadosAoVivo | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [soSemResposta, setSoSemResposta] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/admin/ao-vivo/${webinarId}/dados`, { cache: "no-store" });
      if (!resposta.ok) throw new Error(String(resposta.status));
      const novos = (await resposta.json()) as DadosAoVivo;
      setDados(novos);
      setFalhou(false);
    } catch {
      setFalhou(true);
    }
  }, [webinarId]);

  useEffect(() => {
    let cancelado = false;
    let timeout: number | undefined;
    async function ciclo() {
      await carregar();
      if (!cancelado) timeout = window.setTimeout(ciclo, INTERVALO_ATUALIZACAO_MS);
    }
    ciclo();
    return () => {
      cancelado = true;
      window.clearTimeout(timeout);
    };
  }, [carregar]);

  const comentarios = dados?.comentarios ?? [];
  const semResposta = comentarios.filter((comentario) => comentario.respostas.length === 0);
  const lista = soSemResposta ? semResposta : comentarios;
  const naSala = dados?.assistindo.filter((espectador) => espectador.pagina === "sala").length ?? 0;
  const noReplay = (dados?.assistindo.length ?? 0) - naSala;

  return (
    <div className="space-y-5 pb-16">
      {!ativo && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm text-amber-800">
          Este webinário está inativo: ninguém consegue entrar na sala agora.
        </div>
      )}
      {falhou && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          Não consegui atualizar os dados. Tentando de novo...
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Assistindo agora" valor={dados?.totalAssistindo} destaque />
        <Indicador rotulo="Na sala ao vivo" valor={dados ? naSala : undefined} />
        <Indicador rotulo="No replay" valor={dados ? noReplay : undefined} />
        <Indicador rotulo="Comentários sem resposta" valor={dados ? semResposta.length : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="rounded-xl border border-gray-200 bg-white">
          <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Users className="h-4 w-4 text-gray-400" />
              Quem está assistindo
            </h2>
            <a
              href={webinarPath(slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Abrir sala
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </header>
          {dados === null ? (
            <Aviso texto="Carregando..." />
          ) : dados.assistindo.length === 0 ? (
            <Aviso texto="Ninguém com a sala aberta agora." />
          ) : (
            <ul className="max-h-[36rem] divide-y divide-gray-100 overflow-y-auto">
              {dados.assistindo.map((espectador) => (
                <li key={espectador.visitanteId} className="flex items-center gap-3 px-4 py-3">
                  <PontoAoVivo />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{espectador.nome ?? "Visitante anônimo"}</p>
                    <p className="truncate">
                      <Contato email={espectador.email} whatsapp={espectador.whatsapp} convidado={espectador.convidado} />
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      {espectador.pagina === "replay" ? "Replay" : "Ao vivo"}
                    </span>
                    <p className="mt-1 text-xs tabular-nums text-gray-500">
                      {formatarTempo(espectador.videoSegundos)} · entrou {haQuanto(espectador.entrouEm, dados.agora)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {dados && dados.totalAssistindo > dados.assistindo.length && (
            <p className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
              Mostrando {dados.assistindo.length} de {dados.totalAssistindo}.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              Comentários
            </h2>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={soSemResposta}
                onChange={(evento) => setSoSemResposta(evento.target.checked)}
                className="h-3.5 w-3.5"
              />
              Só sem resposta
            </label>
          </header>
          {dados === null ? (
            <Aviso texto="Carregando..." />
          ) : lista.length === 0 ? (
            <Aviso texto={soSemResposta ? "Tudo respondido." : "Nenhum comentário ainda."} />
          ) : (
            <ul className="max-h-[36rem] divide-y divide-gray-100 overflow-y-auto">
              {lista.map((comentario) => (
                <ItemComentario key={comentario.id} comentario={comentario} agora={dados.agora} onRespondido={carregar} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        <Radio className="h-3.5 w-3.5" />
        Atualiza sozinho a cada 4 segundos. Cada participante vê só os próprios comentários e as respostas do suporte.
      </p>
    </div>
  );
}

function ItemComentario({
  comentario,
  agora,
  onRespondido,
}: {
  comentario: ComentarioPainel;
  agora: string;
  onRespondido: () => Promise<void>;
}) {
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function responder(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!resposta.trim() || enviando) return;
    setEnviando(true);
    const resultado = await responderComentario(comentario.id, resposta);
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setErro(null);
    setResposta("");
    await onRespondido();
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-gray-900">
          {comentario.nomeAutor}{" "}
          <Contato email={comentario.email} whatsapp={comentario.whatsapp} convidado={comentario.convidado} />
        </p>
        <p className="text-xs tabular-nums text-gray-400">
          {comentario.pagina === "replay" ? "Replay" : "Ao vivo"} · {formatarTempo(comentario.videoSegundos)} do vídeo ·{" "}
          {haQuanto(comentario.criadoEm, agora)}
        </p>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{comentario.texto}</p>

      {comentario.respostas.map((item) => (
        <div key={item.id} className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm">
          <span className="font-semibold text-emerald-700">{item.nomeAutor}: </span>
          <span className="break-words text-gray-700">{item.texto}</span>
        </div>
      ))}

      <form onSubmit={responder} className="mt-2 flex gap-2">
        <input
          value={resposta}
          onChange={(evento) => setResposta(evento.target.value)}
          maxLength={MAX_COMENTARIO}
          placeholder={comentario.respostas.length > 0 ? "Responder de novo" : "Responder como suporte"}
          aria-label={`Responder ${comentario.nomeAutor}`}
          className="h-9 min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={enviando || !resposta.trim()}
          className="h-9 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Responder"}
        </button>
      </form>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </li>
  );
}

function Indicador({ rotulo, valor, destaque = false }: { rotulo: string; valor: number | undefined; destaque?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-gray-500">
        {destaque && <PontoAoVivo />}
        {rotulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{valor ?? "—"}</p>
    </div>
  );
}

function Contato({ email, whatsapp, convidado }: { email: string | null; whatsapp: string | null; convidado: boolean }) {
  const numero = whatsapp ? normalizarWhatsapp(whatsapp) : null;
  if (numero) {
    return (
      <a
        href={`https://wa.me/${numero}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-normal text-emerald-700 hover:underline"
      >
        WhatsApp {formatarWhatsapp(numero)}
      </a>
    );
  }
  const texto = whatsapp ?? email ?? (convidado ? "Convidado, sem dados" : "Ainda não entrou no chat");
  return <span className="text-xs font-normal text-gray-500">{texto}</span>;
}

function PontoAoVivo() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function Aviso({ texto }: { texto: string }) {
  return <p className="px-4 py-10 text-center text-sm text-gray-500">{texto}</p>;
}
