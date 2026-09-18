"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { perguntarAoAgenteSuporte, pedirAbordagemPitch } from "@/app/[slug]/actions";
import type { MensagemAgente } from "@/lib/agenteSuporte";

type SuporteFlutuanteProps = {
  webinarId: string;
  canalSlug: string | null;
  nome: string | null;
  fotoUrl: string | null;
  pitchTimestampSeconds: number;
  // Relogio de CONTEUDO (o mesmo que decide quando a oferta aparece) - assim
  // a abordagem do agente dispara junto com o bloco de oferta, nao com o
  // relogio da agenda.
  elapsedSeconds: number;
};

const MAX_TEXTO = 500;

/**
 * Chat de suporte flutuante (tipo Jivochat): fica minimizado no canto até o
 * visitante clicar, e se abre sozinho quando o vídeo chega no pitch, com uma
 * mensagem proativa do agente. Conversa em tempo real com a API da
 * Anthropic (ver src/lib/agenteSuporte.ts) - contexto e config (nome, tom,
 * roteiro) sao buscados no servidor a partir do webinarId, nunca vem do
 * cliente.
 */
export function SuporteFlutuante({ webinarId, canalSlug, nome, fotoUrl, pitchTimestampSeconds, elapsedSeconds }: SuporteFlutuanteProps) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemAgente[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);

  const abordouRef = useRef(false);
  const contadorLidoRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nomeExibido = nome?.trim() || "Suporte";
  const inicial = nomeExibido.charAt(0).toUpperCase();
  const jaPassouPitch = elapsedSeconds >= pitchTimestampSeconds;

  // Abordagem proativa: dispara uma unica vez, assim que o pitch comeca.
  useEffect(() => {
    if (!jaPassouPitch || abordouRef.current) return;
    abordouRef.current = true;
    let cancelado = false;
    (async () => {
      const resultado = await pedirAbordagemPitch(webinarId, canalSlug);
      if (cancelado || !resultado.ok) return;
      setMensagens((atuais) => [...atuais, { autor: "agente", texto: resultado.resposta }]);
      setAberto(true);
    })();
    return () => {
      cancelado = true;
    };
  }, [jaPassouPitch, webinarId, canalSlug]);

  // Badge de nao lidas: so conta mensagens do agente chegadas com o widget fechado.
  useEffect(() => {
    if (!aberto && mensagens.length > contadorLidoRef.current) {
      setNaoLidas((atual) => atual + (mensagens.length - contadorLidoRef.current));
    }
    contadorLidoRef.current = mensagens.length;
  }, [mensagens, aberto]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.length]);

  function abrir() {
    setAberto(true);
    setNaoLidas(0);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const valor = texto.trim();
    if (!valor || enviando) return;

    const historico = [...mensagens, { autor: "visitante" as const, texto: valor }];
    setMensagens(historico);
    setTexto("");
    setErro(null);
    setEnviando(true);

    const resultado = await perguntarAoAgenteSuporte(webinarId, canalSlug, jaPassouPitch, historico);
    setEnviando(false);

    if (resultado.ok) {
      setMensagens((atuais) => [...atuais, { autor: "agente", texto: resultado.resposta }]);
    } else {
      setErro(resultado.erro);
    }
  }

  function Avatar() {
    if (fotoUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={fotoUrl} alt={nomeExibido} className="h-7 w-7 shrink-0 rounded-full object-cover" />;
    }
    return (
      <span className="room-accent-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {inicial}
      </span>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {aberto && (
        <div
          className="room-surface flex h-[28rem] w-[20rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl"
          role="dialog"
          aria-label="Chat de suporte"
        >
          <div className="room-accent-bg flex shrink-0 items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{nomeExibido}</p>
              <p className="text-[11px] opacity-80">Costuma responder na hora</p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar chat de suporte"
              className="rounded-full p-1 opacity-80 transition hover:opacity-100"
            >
              <IconFechar />
            </button>
          </div>

          <div ref={scrollRef} className="room-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {mensagens.length === 0 && (
              <div className="flex items-start gap-2">
                <Avatar />
                <p className="room-surface max-w-[80%] rounded-2xl rounded-tl-sm border px-3 py-2 text-sm leading-snug">
                  Oi! Alguma dúvida sobre a aula? Pode perguntar por aqui 🙂
                </p>
              </div>
            )}
            {mensagens.map((mensagem, indice) =>
              mensagem.autor === "agente" ? (
                <div key={indice} className="flex items-start gap-2">
                  <Avatar />
                  <p className="room-surface max-w-[80%] rounded-2xl rounded-tl-sm border px-3 py-2 text-sm leading-snug">
                    {mensagem.texto}
                  </p>
                </div>
              ) : (
                <div key={indice} className="flex justify-end">
                  <p className="room-accent-bg max-w-[80%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-snug">
                    {mensagem.texto}
                  </p>
                </div>
              ),
            )}
            {enviando && (
              <div className="flex items-start gap-2">
                <Avatar />
                <p className="room-surface room-muted rounded-2xl rounded-tl-sm border px-3 py-2 text-sm">
                  digitando...
                </p>
              </div>
            )}
          </div>

          <form onSubmit={enviar} className="shrink-0 border-t p-2.5" style={{ borderColor: "var(--room-border)" }}>
            {erro && <p className="mb-1.5 px-1 text-xs text-red-600">{erro}</p>}
            <div className="flex items-center gap-2">
              <input
                value={texto}
                onChange={(evento) => setTexto(evento.target.value.slice(0, MAX_TEXTO))}
                placeholder="Escreva sua dúvida..."
                aria-label="Escreva sua dúvida"
                className="h-9 w-full min-w-0 rounded-full border bg-transparent px-3.5 text-sm outline-none transition focus:border-[var(--room-accent)]"
                style={{ borderColor: "var(--room-border)" }}
              />
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                aria-label="Enviar"
                className="room-accent-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-50"
              >
                <IconEnviar />
              </button>
            </div>
          </form>
        </div>
      )}

      {!aberto && (
        <button
          type="button"
          onClick={abrir}
          aria-label="Abrir chat de suporte"
          className="room-accent-bg relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition hover:scale-105"
        >
          <IconChat />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
              {naoLidas}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <path d="M4 4h16v12H7l-3 3V4Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconFechar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function IconEnviar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" strokeLinejoin="round" />
    </svg>
  );
}
