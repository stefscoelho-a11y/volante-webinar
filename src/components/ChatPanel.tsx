"use client";

import { useEffect, useRef, useState } from "react";

export type ChatMessageData = {
  id: string;
  timestampSegundos: number;
  nomeAutor: string;
  texto: string;
  tipo: string; // "mensagem" | "sistema"
};

type ChatPanelProps = {
  messages: ChatMessageData[];
  elapsedSeconds: number;
};

function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0][0]!.toUpperCase();
  return (partes[0][0]! + partes[1][0]!).toUpperCase();
}

function getAvatarColor(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 60%, 45%)`;
}

export function ChatPanel({ messages, elapsedSeconds }: ChatPanelProps) {
  // Guardamos so os IDs ja exibidos (nao o array inteiro) pra nunca duplicar
  // mensagem, mesmo que o efeito rode de novo pro mesmo tick do relogio.
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A cada tick do relogio compartilhado (useElapsedSeconds, no componente
    // pai), comparamos o tempo decorrido com o timestamp de cada mensagem do
    // roteiro. Se ja passou e a mensagem ainda nao apareceu, ela entra. Isso
    // tambem resolve o "catch-up": se a pessoa entrar no meio do video, todas
    // as mensagens anteriores ja aparecem de uma vez no primeiro tick.
    setVisibleIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const message of messages) {
        if (message.timestampSegundos <= elapsedSeconds && !next.has(message.id)) {
          next.add(message.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [elapsedSeconds, messages]);

  const visibleMessages = messages.filter((message) => visibleIds.has(message.id));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages.length]);

  return (
    <div className="flex h-full max-h-[70vh] flex-col rounded-lg border border-gray-200 bg-white lg:max-h-none">
      <div className="flex items-center gap-2 border-b border-gray-200 p-3 text-sm font-semibold text-gray-800">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Chat ao vivo
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {visibleMessages.length === 0 && (
          <p className="text-center text-xs text-gray-400">O chat vai comecar em instantes...</p>
        )}
        {visibleMessages.map((message) =>
          message.tipo === "sistema" ? (
            <p key={message.id} className="text-center text-xs italic text-gray-500">
              {message.texto}
            </p>
          ) : (
            <div key={message.id} className="flex items-start gap-2">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: getAvatarColor(message.nomeAutor) }}
              >
                {getInitials(message.nomeAutor)}
              </span>
              <p className="text-sm leading-snug">
                <span className="font-semibold text-gray-900">{message.nomeAutor}</span>{" "}
                <span className="text-gray-700">{message.texto}</span>
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
