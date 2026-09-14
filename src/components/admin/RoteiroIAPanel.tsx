"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import {
  aplicarPitchDetectado,
  gerarRoteiroComIA,
  removerTranscricao,
  salvarTranscricao,
} from "@/app/admin/webinars/[id]/chat/actions";
import { formatarTempo } from "@/lib/legendas";
import type { DensidadeChat, MensagemGerada, PitchDetectado } from "@/lib/roteiroIA";

export type TranscricaoInfo = {
  nomeArquivo: string | null;
  totalSegmentos: number;
  duracaoSegundos: number;
};

type ModoAplicacao = "substituir" | "adicionar";

type RoteiroIAPanelProps = {
  webinarId: string;
  transcricao: TranscricaoInfo | null;
  pitchTimestampSeconds: number;
  temMensagens: boolean;
  onRoteiroGerado: (mensagens: MensagemGerada[], modo: ModoAplicacao) => void;
};

// Mesmo limite validado na server action. Checar aqui evita estourar o limite
// de 1MB do body do Next antes mesmo da action rodar.
const TAMANHO_MAXIMO_LEGENDA_BYTES = 900 * 1024;

const inputClass = "rounded border border-gray-300 bg-gray-100 px-2 py-1 text-sm outline-none focus:border-emerald-500";
const botaoSecundarioClass = "rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-300 disabled:opacity-50";

export function RoteiroIAPanel({
  webinarId,
  transcricao,
  pitchTimestampSeconds,
  temMensagens,
  onRoteiroGerado,
}: RoteiroIAPanelProps) {
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [enviandoArquivo, startEnvioArquivo] = useTransition();
  const [gerando, startGeracao] = useTransition();
  const [aplicandoPitch, startAplicarPitch] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [densidade, setDensidade] = useState<DensidadeChat>("media");
  const [modo, setModo] = useState<ModoAplicacao>("substituir");
  const [instrucoes, setInstrucoes] = useState("");
  const [resultado, setResultado] = useState<{
    totalMensagens: number;
    modo: ModoAplicacao;
    pitch: PitchDetectado | null;
  } | null>(null);
  const [pitchAtual, setPitchAtual] = useState(pitchTimestampSeconds);

  function handleArquivo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    // Limpa o input pra permitir reenviar o mesmo arquivo depois de corrigi-lo
    event.target.value = "";
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_LEGENDA_BYTES) {
      setErro("Arquivo muito grande (máximo de 900 KB).");
      return;
    }

    const formData = new FormData();
    formData.set("arquivo", arquivo);
    setErro(null);
    startEnvioArquivo(async () => {
      try {
        const resposta = await salvarTranscricao(webinarId, formData);
        if (resposta.ok) setResultado(null);
        else setErro(resposta.erro);
      } catch {
        setErro("Falha ao enviar a legenda. Tente de novo.");
      }
    });
  }

  function handleRemover() {
    if (!window.confirm("Remover a transcrição deste webinário?")) return;
    setErro(null);
    startEnvioArquivo(async () => {
      try {
        await removerTranscricao(webinarId);
        setResultado(null);
      } catch {
        setErro("Falha ao remover a transcrição.");
      }
    });
  }

  function handleGerar() {
    if (
      modo === "substituir" &&
      temMensagens &&
      !window.confirm("As mensagens que estão no editor serão substituídas. Continuar?")
    ) {
      return;
    }
    setErro(null);
    setResultado(null);
    startGeracao(async () => {
      try {
        const resposta = await gerarRoteiroComIA(webinarId, { densidade, instrucoes });
        if (!resposta.ok) {
          setErro(resposta.erro);
          return;
        }
        onRoteiroGerado(resposta.mensagens, modo);
        setResultado({ totalMensagens: resposta.mensagens.length, modo, pitch: resposta.pitch });
      } catch {
        setErro("A geração demorou demais ou falhou. Tente de novo com um volume de chat menor.");
      }
    });
  }

  function handleAplicarPitch(segundos: number) {
    setErro(null);
    startAplicarPitch(async () => {
      try {
        await aplicarPitchDetectado(webinarId, segundos);
        setPitchAtual(segundos);
      } catch {
        setErro("Falha ao salvar o momento da oferta.");
      }
    });
  }

  const pitch = resultado?.pitch ?? null;

  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Gerar roteiro com IA</h2>

      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-gray-700">1. Legenda do vídeo</p>
        {transcricao ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-800">{transcricao.nomeArquivo ?? "legenda"}</span>
            <span className="text-xs text-gray-500">
              {transcricao.totalSegmentos} trechos · {formatarTempo(transcricao.duracaoSegundos)}
            </span>
            <button
              type="button"
              onClick={() => inputArquivoRef.current?.click()}
              disabled={enviandoArquivo || gerando}
              className={botaoSecundarioClass}
            >
              {enviandoArquivo ? "Enviando..." : "Trocar arquivo"}
            </button>
            <button
              type="button"
              onClick={handleRemover}
              disabled={enviandoArquivo || gerando}
              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => inputArquivoRef.current?.click()}
              disabled={enviandoArquivo}
              className={botaoSecundarioClass}
            >
              {enviandoArquivo ? "Enviando..." : "Enviar legenda (.srt ou .vtt)"}
            </button>
            <p className="mt-1 text-xs text-gray-500">
              Exporte a legenda do Premiere ou CapCut, ou baixe a do vídeo no YouTube Studio (Legendas → Baixar).
            </p>
          </div>
        )}
        <input ref={inputArquivoRef} type="file" accept=".srt,.vtt" onChange={handleArquivo} className="hidden" />
      </div>

      <fieldset disabled={!transcricao || gerando} className="space-y-3 disabled:opacity-60">
        <p className="text-xs font-medium text-gray-700">2. Gerar mensagens e detectar o pitch</p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-800">
          <label className="flex items-center gap-2">
            Volume do chat
            <select
              value={densidade}
              onChange={(e) => setDensidade(e.target.value as DensidadeChat)}
              className={inputClass}
            >
              <option value="baixa">Baixo (~1 por minuto)</option>
              <option value="media">Médio (~2 a 3 por minuto)</option>
              <option value="alta">Alto (~5 por minuto)</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={modo === "substituir"} onChange={() => setModo("substituir")} />
            Substituir roteiro
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={modo === "adicionar"} onChange={() => setModo("adicionar")} />
            Adicionar ao roteiro
          </label>
        </div>
        <textarea
          value={instrucoes}
          onChange={(e) => setInstrucoes(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Instruções extras (opcional). Ex: público de dentistas, tom mais descontraído, mais perguntas sobre a garantia."
          className={`${inputClass} w-full`}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGerar}
            className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            {gerando ? "Gerando..." : "Gerar roteiro"}
          </button>
          {gerando && <span className="text-xs text-gray-500">Pode levar alguns minutos em webinars longos.</span>}
        </div>
      </fieldset>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      {resultado && (
        <p className="mt-3 text-sm text-emerald-700">
          {resultado.totalMensagens} mensagens {resultado.modo === "substituir" ? "carregadas" : "adicionadas"} no
          editor abaixo. Revise e clique em &quot;Salvar roteiro&quot;.
        </p>
      )}

      {resultado &&
        (pitch ? (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-gray-900">
              Pitch detectado em {formatarTempo(pitch.timestampSegundos)} ({pitch.timestampSegundos}s)
            </p>
            {pitch.trechoFalado && <p className="mt-1 italic text-gray-700">“{pitch.trechoFalado}”</p>}
            {pitch.justificativa && <p className="mt-1 text-xs text-gray-600">{pitch.justificativa}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {pitchAtual === pitch.timestampSegundos ? (
                <span className="text-xs text-emerald-700">A oferta aparece nesse momento.</span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleAplicarPitch(pitch.timestampSegundos)}
                    disabled={aplicandoPitch}
                    className="rounded bg-amber-500 px-3 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {aplicandoPitch ? "Salvando..." : "Usar como momento da oferta"}
                  </button>
                  <span className="text-xs text-gray-500">
                    Atual: {formatarTempo(pitchAtual)} ({pitchAtual}s)
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">Nenhum pitch identificado na transcrição.</p>
        ))}
    </section>
  );
}
