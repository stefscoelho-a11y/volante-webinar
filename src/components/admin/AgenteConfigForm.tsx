"use client";

import { useState } from "react";

export type AgenteConfigValues = {
  agenteIaAtivo: boolean;
  agenteNome: string | null;
  agenteFotoUrl: string | null;
  agenteInformacoesProduto: string | null;
  agenteTom: string | null;
  agenteRoteiroAula: string | null;
};

type AgenteConfigFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  values: AgenteConfigValues;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-orange-500";
const textareaClass = `${inputClass} min-h-28 resize-y`;

export function AgenteConfigForm({ action, values }: AgenteConfigFormProps) {
  const [ativo, setAtivo] = useState(values.agenteIaAtivo);
  const [fotoUrl, setFotoUrl] = useState(values.agenteFotoUrl ?? "");
  const [erroFoto, setErroFoto] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Agente de IA ativo neste webinário</p>
          <p className="text-xs text-gray-500">
            Quando ativo, o chat flutuante de suporte aparece na sala, na apresentação (JIT) e no replay deste
            webinário, e aborda automaticamente quem estiver assistindo assim que o pitch começar.
          </p>
        </div>
        <input
          type="checkbox"
          name="agenteIaAtivo"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="h-5 w-9 shrink-0 accent-orange-500"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Nome do agente (aparece pro visitante como se fosse uma pessoa)">
          <input
            name="agenteNome"
            defaultValue={values.agenteNome ?? ""}
            placeholder="Ex: Camila, Suporte"
            maxLength={60}
            className={inputClass}
          />
        </Field>

        <Field label="Foto do agente (URL, opcional)">
          <div className="flex items-center gap-3">
            <input
              name="agenteFotoUrl"
              value={fotoUrl}
              onChange={(e) => {
                setFotoUrl(e.target.value);
                setErroFoto(false);
              }}
              placeholder="https://.../foto.jpg"
              className={`${inputClass} sm:w-56`}
            />
            {fotoUrl && !erroFoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoUrl}
                alt="Prévia da foto do agente"
                onError={() => setErroFoto(true)}
                className="h-9 w-9 shrink-0 rounded-full border border-gray-300 object-cover"
              />
            )}
          </div>
        </Field>
      </div>

      <Field
        label="Tom de conversa"
        hint="Como o agente deve falar: mais calmo, mais direto, mais informal/formal, uso de emojis, etc. Isso molda cada resposta."
      >
        <textarea
          name="agenteTom"
          defaultValue={values.agenteTom ?? ""}
          placeholder="Ex: Fale de forma calma e acolhedora, como uma consultora experiente. Use poucos emojis. Nunca seja insistente - conduza a pessoa a decidir sozinha, sem pressionar."
          className={textareaClass}
        />
      </Field>

      <Field
        label="Informações extras do produto"
        hint="Diferenciais, bônus, garantia, para quem é (ou não é), objeções comuns e como respondê-las. O agente usa isso pra vender e tirar dúvidas depois do pitch."
      >
        <textarea
          name="agenteInformacoesProduto"
          defaultValue={values.agenteInformacoesProduto ?? ""}
          placeholder="Ex: Garantia incondicional de 7 dias. Inclui 3 bônus: [...]. Ideal pra quem já tem um negócio rodando. Objeção comum: 'não tenho tempo' - responder que o curso é em módulos curtos, encaixa em 20min/dia."
          className={textareaClass}
        />
      </Field>

      <Field
        label="Roteiro da aula"
        hint="Um resumo do que acontece na aula (tópicos, ordem, principais pontos). O agente usa isso pra responder dúvidas sobre o conteúdo com segurança, antes do pitch."
      >
        <textarea
          name="agenteRoteiroAula"
          defaultValue={values.agenteRoteiroAula ?? ""}
          placeholder="Ex: Aula começa explicando o problema X, depois mostra o método Y em 3 passos, com um case real no meio, e fecha com a oferta."
          className={`${textareaClass} min-h-36`}
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
        >
          Salvar agente
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-500">{label}</label>
      {hint && <p className="mb-1.5 text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}
