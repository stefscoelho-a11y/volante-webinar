"use client";

import { useEffect, useRef, useState } from "react";
import type { TemaSala } from "@/lib/webinarVisual";

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
  tema: TemaSala;
  viewerCount: number;
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

export function ChatPanel({ messages, elapsedSeconds, tema, viewerCount }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "suporte">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derivado do relogio compartilhado: quem entra no meio recebe o historico
  // anterior, e o preview do admin pode voltar no tempo sem estado residual.
  const visibleMessages = messages.filter((message) => message.timestampSegundos <= elapsedSeconds);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages.length]);

  const isYouTube = tema === "youtube";

  return (
    <aside
      aria-label="Chat do webinar"
      className={`room-surface flex h-full flex-col overflow-hidden border bg-white lg:min-h-0 ${
        isYouTube ? "min-h-[24rem]" : "min-h-[52rem]"
      } ${
        isYouTube ? "rounded-xl" : "rounded-lg shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
      }`}
    >
      {isYouTube ? (
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4" style={{ borderColor: "var(--room-border)" }}>
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold tracking-tight">Chat ao vivo</h2>
            <span className="room-muted text-xs tabular-nums">{viewerCount.toLocaleString("pt-BR")}</span>
          </div>
          <span aria-hidden="true" className="room-muted text-xl leading-none">⋮</span>
        </div>
      ) : (
        <div className="m-2 grid h-10 shrink-0 grid-cols-2 rounded-md bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`rounded-[5px] font-medium transition ${
              activeTab === "chat" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suporte")}
            className={`rounded-[5px] font-medium transition ${
              activeTab === "suporte" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Suporte
          </button>
        </div>
      )}

      {activeTab === "suporte" && !isYouTube ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div className="max-w-52">
            <IconSupport />
            <p className="mt-3 text-sm font-semibold">Precisa de ajuda?</p>
            <p className="room-muted mt-1 text-xs leading-relaxed">Entre em contato com a equipe responsável por este webinar.</p>
          </div>
        </div>
      ) : (
      <div ref={scrollRef} className={`room-scrollbar flex-1 overflow-y-auto ${isYouTube ? "space-y-3 px-4 py-3" : "space-y-3 px-3 py-4"}`}>
        {visibleMessages.length === 0 && (
          <p className="room-muted py-8 text-center text-xs">O chat vai começar em instantes...</p>
        )}
        {visibleMessages.map((message) =>
          message.tipo === "sistema" ? (
            <p key={message.id} className="room-muted text-center text-xs italic">
              {message.texto}
            </p>
          ) : (
            <div key={message.id} className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
                  isYouTube ? "h-7 w-7 text-[10px]" : "h-6 w-6 text-[9px]"
                }`}
                style={{ backgroundColor: getAvatarColor(message.nomeAutor) }}
              >
                {getInitials(message.nomeAutor)}
              </span>
              <p className={`${isYouTube ? "text-[13px]" : "text-sm"} leading-snug`}>
                <span className={`${isYouTube ? "font-semibold" : "room-muted font-semibold"}`}>{message.nomeAutor}</span>{" "}
                <span>{message.texto}</span>
              </p>
            </div>
          ),
        )}
      </div>
      )}

      <div className="room-muted flex min-h-14 shrink-0 items-center justify-center border-t px-4 text-center text-xs" style={{ borderColor: "var(--room-border)" }}>
        Comentários desativados...
      </div>
    </aside>
  );
}

function IconSupport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="room-muted mx-auto h-8 w-8">
      <path d="M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-2v-6h4M4 13h4v6H6a2 2 0 0 1-2-2v-4Z" />
      <path d="M12 21h3" />
    </svg>
  );
}
