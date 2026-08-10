"use client";

import { useMemo, useState, useTransition } from "react";
import { AdminVideoScrubber } from "./AdminVideoScrubber";
import { saveChatScript } from "@/app/admin/webinars/[id]/chat/actions";

type EditableMessage = {
  key: string;
  timestampSegundos: number;
  nomeAutor: string;
  texto: string;
  tipo: "mensagem" | "sistema";
};

type ChatScriptEditorProps = {
  webinarId: string;
  videoId: string;
  initialMessages: Array<{
    id: string;
    timestampSegundos: number;
    nomeAutor: string;
    texto: string;
    tipo: string;
  }>;
};

function randomKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
}

// Sem w-full aqui de proposito: cada input abaixo define sua propria largura
// (w-20/w-28/w-32/flex-1) e "w-full" empataria na especificidade do Tailwind,
// vencendo de forma imprevisivel dependendo da ordem de geracao do CSS.
const inputClass = "rounded border border-gray-300 bg-gray-100 px-2 py-1 text-sm outline-none focus:border-emerald-500";

export function ChatScriptEditor({ webinarId, videoId, initialMessages }: ChatScriptEditorProps) {
  const [messages, setMessages] = useState<EditableMessage[]>(() =>
    initialMessages.map((message) => ({
      key: message.id,
      timestampSegundos: message.timestampSegundos,
      nomeAutor: message.nomeAutor,
      texto: message.texto,
      tipo: message.tipo === "sistema" ? "sistema" : "mensagem",
    })),
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const previewMessages = useMemo(
    () => messages.filter((message) => message.timestampSegundos <= currentTime && message.texto.trim()),
    [messages, currentTime],
  );

  function updateMessage(key: string, patch: Partial<EditableMessage>) {
    setMessages((prev) => prev.map((message) => (message.key === key ? { ...message, ...patch } : message)));
  }

  function removeMessage(key: string) {
    setMessages((prev) => prev.filter((message) => message.key !== key));
  }

  function moveMessage(key: string, direction: -1 | 1) {
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.key === key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function addMessage(prefillTimestamp?: number) {
    setMessages((prev) => [
      ...prev,
      {
        key: randomKey(),
        timestampSegundos: prefillTimestamp ?? 0,
        nomeAutor: "",
        texto: "",
        tipo: "mensagem",
      },
    ]);
  }

  function handleSave() {
    const formData = new FormData();
    formData.set(
      "mensagens",
      JSON.stringify(
        messages.map((message) => ({
          timestampSegundos: message.timestampSegundos,
          nomeAutor: message.nomeAutor,
          texto: message.texto,
          tipo: message.tipo,
        })),
      ),
    );
    startTransition(async () => {
      await saveChatScript(webinarId, formData);
      setSavedAt(Date.now());
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => addMessage(Math.floor(currentTime))}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-300"
          >
            + Adicionar no tempo atual ({Math.floor(currentTime)}s)
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Salvar roteiro"}
          </button>
          {savedAt && !pending && <span className="text-xs text-emerald-600">Salvo!</span>}
        </div>

        <div className="space-y-2">
          {messages.map((message, index) => (
            <div key={message.key} className="flex items-start gap-2 rounded border border-gray-200 bg-white p-2">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveMessage(message.key, -1)}
                  disabled={index === 0}
                  className="text-gray-500 hover:text-gray-800 disabled:opacity-20"
                  aria-label="Mover pra cima"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveMessage(message.key, 1)}
                  disabled={index === messages.length - 1}
                  className="text-gray-500 hover:text-gray-800 disabled:opacity-20"
                  aria-label="Mover pra baixo"
                >
                  ▼
                </button>
              </div>

              <input
                type="number"
                value={message.timestampSegundos}
                onChange={(e) => updateMessage(message.key, { timestampSegundos: Number(e.target.value) })}
                className={`${inputClass} w-20`}
                aria-label="Segundos"
              />

              <select
                value={message.tipo}
                onChange={(e) => updateMessage(message.key, { tipo: e.target.value as "mensagem" | "sistema" })}
                className={`${inputClass} w-28`}
              >
                <option value="mensagem">mensagem</option>
                <option value="sistema">sistema</option>
              </select>

              <input
                value={message.nomeAutor}
                onChange={(e) => updateMessage(message.key, { nomeAutor: e.target.value })}
                placeholder="Autor"
                className={`${inputClass} w-32`}
              />

              <input
                value={message.texto}
                onChange={(e) => updateMessage(message.key, { texto: e.target.value })}
                placeholder="Texto da mensagem"
                className={`${inputClass} flex-1`}
              />

              <button
                type="button"
                onClick={() => removeMessage(message.key)}
                className="px-2 text-red-600 hover:text-red-700"
                aria-label="Remover"
              >
                ✕
              </button>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-gray-500">Nenhuma mensagem no roteiro ainda.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <AdminVideoScrubber videoId={videoId} onTimeUpdate={setCurrentTime} />
        <p className="text-xs text-gray-500">
          Toque play, pause e arraste a barra livremente pra achar o segundo certo de cada mensagem - aqui os
          controles do YouTube ficam liberados (ao contrario da sala publica).
        </p>

        <div className="flex h-64 flex-col rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-2 text-xs font-semibold text-gray-700">
            Previa do chat (ate {Math.floor(currentTime)}s)
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {previewMessages.map((message) =>
              message.tipo === "sistema" ? (
                <p key={message.key} className="text-center text-xs italic text-gray-500">
                  {message.texto}
                </p>
              ) : (
                <div key={message.key} className="text-xs">
                  <span className="font-semibold text-emerald-600">{message.nomeAutor || "Anonimo"}: </span>
                  <span className="text-gray-800">{message.texto}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
