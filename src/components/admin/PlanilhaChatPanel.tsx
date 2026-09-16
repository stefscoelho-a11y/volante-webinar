"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { importarPlanilhaChat } from "@/app/admin/webinars/[id]/chat/actions";
import type { MensagemChatImportada } from "@/lib/chatMensagens";

type ModoImportacao = "substituir" | "adicionar";

type PlanilhaChatPanelProps = {
  webinarId: string;
  temMensagens: boolean;
  onImportar: (mensagens: MensagemChatImportada[], modo: ModoImportacao) => void;
};

type Resultado = { erro: string } | { texto: string; avisos: string[] };

export function PlanilhaChatPanel({ webinarId, temMensagens, onImportar }: PlanilhaChatPanelProps) {
  const [modo, setModo] = useState<ModoImportacao>("substituir");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function importar(arquivo: File) {
    const formData = new FormData();
    formData.set("arquivo", arquivo);
    startTransition(async () => {
      const resposta = await importarPlanilhaChat(webinarId, formData);
      if (inputRef.current) inputRef.current.value = "";
      if (!resposta.ok) {
        setResultado({ erro: resposta.erro });
        return;
      }
      // Igual ao roteiro da IA: entra so no editor, nada vai pro banco antes de salvar
      onImportar(resposta.mensagens, temMensagens ? modo : "substituir");
      const total = resposta.mensagens.length;
      setResultado({
        texto: `${total} ${total === 1 ? "mensagem importada" : "mensagens importadas"}. Revise e clique em "Salvar roteiro" para gravar.`,
        avisos: resposta.avisos,
      });
    });
  }

  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Planilha de comentários</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Modelo do HotWebinar (.xlsx ou .csv): Hora, Minuto, Segundo, Nome do participante, Texto enviado e
              Suporte.
            </p>
          </div>
        </div>
        <a
          href={`/admin/webinars/${webinarId}/chat/exportar`}
          download
          title="Baixa o roteiro salvo"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Exportar planilha
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {temMensagens && (
          <select
            value={modo}
            onChange={(evento) => setModo(evento.target.value as ModoImportacao)}
            aria-label="O que fazer com o roteiro atual"
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700"
          >
            <option value="substituir">Substituir o roteiro atual</option>
            <option value="adicionar">Adicionar ao roteiro atual</option>
          </select>
        )}
        <label
          className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-orange-500 px-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-400 ${
            pending ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <Upload className="h-4 w-4" />
          {pending ? "Lendo planilha..." : "Importar planilha"}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0];
              if (arquivo) importar(arquivo);
            }}
          />
        </label>
        <span className="text-xs text-gray-400">A exportação baixa o roteiro já salvo.</span>
      </div>

      {resultado &&
        ("erro" in resultado ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resultado.erro}</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">{resultado.texto}</p>
            {resultado.avisos.map((aviso) => (
              <p key={aviso} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {aviso}
              </p>
            ))}
          </div>
        ))}
    </section>
  );
}
