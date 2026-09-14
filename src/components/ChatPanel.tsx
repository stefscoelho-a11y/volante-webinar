"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { TemaSala } from "@/lib/webinarVisual";
import { dividirLinks } from "@/lib/chatMensagens";
import { MAX_COMENTARIO, type ChatAoVivoConfig } from "@/lib/chatAoVivo";
import { useChatAoVivo, type ChatAoVivo } from "@/hooks/useChatAoVivo";

// A resposta do suporte e posicionada alguns segundos "a frente" na timeline
// do participante; a folga evita que ela fique escondida esperando o relogio.
const FOLGA_COMENTARIO_REAL_SEGUNDOS = 15;

export type ChatMessageData = {
  id: string;
  timestampSegundos: number;
  nomeAutor: string;
  texto: string;
  tipo: string; // "mensagem" | "sistema" | "suporte" | "participante" (comentario real do espectador)
};

type ChatPanelProps = {
  messages: ChatMessageData[];
  elapsedSeconds: number;
  tema: TemaSala;
  viewerCount: number;
  chatAoVivo?: ChatAoVivoConfig;
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

export function ChatPanel({ messages, elapsedSeconds, tema, viewerCount, chatAoVivo }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "suporte">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useChatAoVivo(chatAoVivo, elapsedSeconds);

  // Comentarios reais entram na timeline no ponto do video em que foram enviados
  const comentariosReais: ChatMessageData[] = chat.comentarios.map((comentario) => ({
    id: `real-${comentario.id}`,
    timestampSegundos: comentario.videoSegundos,
    nomeAutor: comentario.nomeAutor,
    texto: comentario.texto,
    tipo: comentario.tipo,
  }));

  // Derivado do relogio compartilhado: quem entra no meio recebe o historico
  // anterior, e o preview do admin pode voltar no tempo sem estado residual.
  const visibleMessages = [...messages, ...comentariosReais]
    .filter(
      (message) =>
        message.timestampSegundos <=
        elapsedSeconds + (message.id.startsWith("real-") ? FOLGA_COMENTARIO_REAL_SEGUNDOS : 0),
    )
    .sort((a, b) => a.timestampSegundos - b.timestampSegundos);
  const mensagensSuporte = visibleMessages.filter((message) => message.tipo === "suporte");

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

      {activeTab === "suporte" && !isYouTube && mensagensSuporte.length > 0 ? (
        <div className="room-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {mensagensSuporte.map((message) => (
            <MensagemSuporte key={message.id} message={message} />
          ))}
        </div>
      ) : activeTab === "suporte" && !isYouTube ? (
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
          ) : message.tipo === "suporte" ? (
            <MensagemSuporte key={message.id} message={message} />
          ) : message.tipo === "participante" ? (
            <MensagemParticipante key={message.id} message={message} isYouTube={isYouTube} />
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

      {chat.habilitado ? (
        <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--room-border)" }}>
          <CaixaComentario chat={chat} />
        </div>
      ) : (
        <div className="room-muted flex min-h-14 shrink-0 items-center justify-center border-t px-4 text-center text-xs" style={{ borderColor: "var(--room-border)" }}>
          Comentários desativados...
        </div>
      )}
    </aside>
  );
}

const classeCampoChat =
  "h-9 w-full min-w-0 rounded-md border bg-transparent px-3 text-sm outline-none transition focus:border-[var(--room-accent)]";

function CaixaComentario({ chat }: { chat: ChatAoVivo }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [identificando, setIdentificando] = useState(false);

  // Sem participante, ou convidado que pediu pra informar nome e WhatsApp
  if (!chat.participante || identificando) {
    if (!identificando) {
      return (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setIdentificando(true)}
            className="room-accent-bg h-9 w-full rounded-md text-sm font-semibold transition hover:opacity-90"
          >
            Entrar com nome e WhatsApp
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              setErro(await chat.entrarComoConvidado());
              setEnviando(false);
            }}
            className="room-muted h-8 w-full rounded-md text-sm font-medium transition hover:opacity-80 disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar como convidado"}
          </button>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
        </div>
      );
    }

    return (
      <form
        // onSubmit em vez de action: form com action limpa os campos ao terminar,
        // e quem errasse o WhatsApp teria que digitar o nome de novo
        onSubmit={async (evento) => {
          evento.preventDefault();
          const formData = new FormData(evento.currentTarget);
          setEnviando(true);
          const falha = await chat.entrar(formData);
          setEnviando(false);
          setErro(falha);
          if (!falha) setIdentificando(false);
        }}
        className="space-y-2"
      >
        <p className="room-muted text-xs">Seu nome aparece no chat. O WhatsApp fica só com a equipe.</p>
        <input name="nome" required maxLength={120} autoComplete="name" placeholder="Seu nome" aria-label="Seu nome" className={classeCampoChat} style={{ borderColor: "var(--room-border)" }} />
        <input name="whatsapp" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel" placeholder="WhatsApp com DDD" aria-label="WhatsApp com DDD" className={classeCampoChat} style={{ borderColor: "var(--room-border)" }} />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setIdentificando(false);
              setErro(null);
            }}
            className="room-muted h-9 px-3 text-sm"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="room-accent-bg h-9 flex-1 rounded-md text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar no chat"}
          </button>
        </div>
      </form>
    );
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valor = texto.trim();
    if (!valor || enviando) return;
    setEnviando(true);
    const falha = await chat.comentar(valor);
    setEnviando(false);
    setErro(falha);
    if (!falha) setTexto("");
  }

  return (
    <form onSubmit={enviar}>
      <div className="flex items-center gap-2">
        <input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          maxLength={MAX_COMENTARIO}
          placeholder={`Comentar como ${chat.participante.nome}`}
          aria-label="Escreva um comentário"
          className={classeCampoChat}
          style={{ borderColor: "var(--room-border)" }}
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          aria-label="Enviar comentário"
          className="room-accent-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:opacity-90 disabled:opacity-50"
        >
          <IconEnviar />
        </button>
      </div>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      {chat.participante.convidado && (
        <button
          type="button"
          onClick={() => setIdentificando(true)}
          className="room-muted mt-1.5 text-left text-xs underline underline-offset-2 hover:opacity-80"
        >
          Você está como {chat.participante.nome}. Informar nome e WhatsApp
        </button>
      )}
    </form>
  );
}

// Comentario do proprio espectador (cada um ve so os seus)
function MensagemParticipante({ message, isYouTube }: { message: ChatMessageData; isYouTube: boolean }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-2 py-1.5"
      style={{ background: "color-mix(in srgb, var(--room-foreground) 5%, transparent)" }}
    >
      <span
        className={`room-accent-bg mt-0.5 flex shrink-0 items-center justify-center rounded-full font-semibold ${
          isYouTube ? "h-7 w-7 text-[10px]" : "h-6 w-6 text-[9px]"
        }`}
      >
        {getInitials(message.nomeAutor)}
      </span>
      <p className={`${isYouTube ? "text-[13px]" : "text-sm"} min-w-0 break-words leading-snug`}>
        <span className="font-semibold">{message.nomeAutor}</span> <span className="room-muted text-xs">(você)</span>{" "}
        <span>{message.texto}</span>
      </p>
    </div>
  );
}

function IconEnviar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" strokeLinejoin="round" />
    </svg>
  );
}

// Mensagem da equipe: destacada na cor da sala e com links clicaveis (ex: checkout)
function MensagemSuporte({ message }: { message: ChatMessageData }) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{
        borderColor: "color-mix(in srgb, var(--room-accent) 35%, transparent)",
        background: "color-mix(in srgb, var(--room-accent) 7%, transparent)",
      }}
    >
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <span className="room-accent-text">{message.nomeAutor}</span>
        <span className="room-accent-bg rounded px-1.5 py-px text-[10px] uppercase tracking-wide">Suporte</span>
      </p>
      <p className="mt-1 break-words text-sm leading-snug">
        {dividirLinks(message.texto).map((trecho, indice) =>
          trecho.link ? (
            <a
              key={indice}
              href={trecho.texto}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="room-accent-text break-all font-medium underline underline-offset-2"
            >
              {trecho.texto}
            </a>
          ) : (
            <span key={indice}>{trecho.texto}</span>
          ),
        )}
      </p>
    </div>
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
