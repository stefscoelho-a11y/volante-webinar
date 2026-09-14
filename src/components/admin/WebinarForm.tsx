"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { RepeticaoAgendado, TipoAgendamento } from "@/lib/scheduling";
import { FONTES_SALA, VISUAL_DEFAULTS, getContrastColor, type FonteSala, type TemaSala } from "@/lib/webinarVisual";
import {
  WebinarStepper,
  IconInicio,
  IconAgendamento,
  IconVisual,
  IconOferta,
  IconAudiencia,
  IconIntegracoes,
  IconChat,
  IconPreview,
  IconLinks,
  type WebinarStepKey,
} from "./WebinarStepper";

type WebinarFormValues = {
  titulo: string;
  slug: string;
  videoUrl: string;
  videoDurationSeconds: number;
  pitchTimestampSeconds: number;
  ctaTexto: string;
  ctaLink: string;
  ctaDesaparecerSegundos: number | null;
  ofertaNome: string;
  ofertaTitulo: string;
  ofertaImagemUrl: string;
  ofertaDescricao: string;
  precoOriginal: number | null;
  precoOferta: number | null;
  ctaCountdownMinutos: number | null;
  metaPixelId: string;
  audienciaFakeMin: number | null;
  audienciaFakeMax: number | null;
  tipoAgendamento: TipoAgendamento;
  sincronizarVideoComHorario: boolean;
  ativo: boolean;
  horariosFixos: string[];
  intervaloRecorrenciaMinutos: number | null;
  delayJustInTimeMinutos: number | null;
  // Ja formatados como "YYYY-MM-DDTHH:mm" (valor esperado por <input type="datetime-local">)
  agendadoDataHoraInicio: string;
  agendadoDataHoraFim: string;
  agendadoRepeticao: RepeticaoAgendado;
  temaSala: TemaSala;
  corPrimaria: string;
  corFundo: string;
  corTexto: string;
  fonteSala: FonteSala;
};

type WebinarFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: Partial<WebinarFormValues>;
  submitLabel: string;
  // So presentes quando editando um webinario que ja existe (nao em /novo) -
  // habilitam o painel de links e as etapas Chat Fake / Preview no stepper.
  webinarId?: string;
  initialStep?: WebinarStepKey;
};

const DEFAULTS: WebinarFormValues = {
  titulo: "",
  slug: "",
  videoUrl: "",
  videoDurationSeconds: 600,
  pitchTimestampSeconds: 300,
  ctaTexto: "Quero Garantir Minha Vaga",
  ctaLink: "",
  ctaDesaparecerSegundos: null,
  ofertaNome: "",
  ofertaTitulo: "",
  ofertaImagemUrl: "",
  ofertaDescricao: "",
  precoOriginal: null,
  precoOferta: null,
  ctaCountdownMinutos: null,
  metaPixelId: "",
  audienciaFakeMin: null,
  audienciaFakeMax: null,
  tipoAgendamento: "recorrente",
  sincronizarVideoComHorario: true,
  ativo: true,
  horariosFixos: [],
  intervaloRecorrenciaMinutos: 60,
  delayJustInTimeMinutos: 10,
  agendadoDataHoraInicio: "",
  agendadoDataHoraFim: "",
  agendadoRepeticao: "nenhuma",
  ...VISUAL_DEFAULTS,
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500";

const FORM_STEPS: { key: WebinarStepKey; label: string; icon: typeof IconInicio }[] = [
  { key: "inicio", label: "Início", icon: IconInicio },
  { key: "agendamento", label: "Agendamento", icon: IconAgendamento },
  { key: "visual", label: "Visual", icon: IconVisual },
  { key: "oferta", label: "Oferta", icon: IconOferta },
  { key: "audiencia", label: "Audiência", icon: IconAudiencia },
  { key: "integracoes", label: "Integrações", icon: IconIntegracoes },
];

export function WebinarForm({ action, initialValues, submitLabel, webinarId, initialStep }: WebinarFormProps) {
  const values = { ...DEFAULTS, ...initialValues };
  const [tipoAgendamento, setTipoAgendamento] = useState<TipoAgendamento>(values.tipoAgendamento);
  const [repeticao, setRepeticao] = useState<RepeticaoAgendado>(values.agendadoRepeticao);
  const [step, setStep] = useState<WebinarStepKey>(initialStep ?? "inicio");
  const [temaSala, setTemaSala] = useState<TemaSala>(values.temaSala);
  const [corPrimaria, setCorPrimaria] = useState(values.corPrimaria);
  const [corFundo, setCorFundo] = useState(values.corFundo);
  const [corTexto, setCorTexto] = useState(values.corTexto);
  const [fonteSala, setFonteSala] = useState<FonteSala>(values.fonteSala);

  const stepIndex = FORM_STEPS.findIndex((s) => s.key === step);
  const isLastStep = stepIndex === FORM_STEPS.length - 1;

  const stepperSteps = [
    ...FORM_STEPS.map((s) => ({ key: s.key, label: s.label, icon: s.icon, onClick: () => setStep(s.key) })),
    ...(webinarId
      ? [
          { key: "links" as const, label: "Links", icon: IconLinks, href: `/admin/webinars/${webinarId}/links` },
          { key: "chat" as const, label: "Chat Fake", icon: IconChat, href: `/admin/webinars/${webinarId}/chat` },
          { key: "preview" as const, label: "Preview", icon: IconPreview, href: `/admin/webinars/${webinarId}/preview` },
        ]
      : []),
  ];

  function goToStep(key: WebinarStepKey) {
    setStep(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleContinuar() {
    if (stepIndex < FORM_STEPS.length - 1) goToStep(FORM_STEPS[stepIndex + 1].key);
  }

  function handleVoltar() {
    if (stepIndex > 0) goToStep(FORM_STEPS[stepIndex - 1].key);
  }

  return (
    <form action={action} className="pb-16">
      <WebinarStepper steps={stepperSteps} activeKey={step} />

      {/* Cada etapa fica escondida via `hidden` (nao desmontada) pra manter
          os valores digitados quando o usuario navega entre etapas e no
          submit final, que envia o formulario inteiro de uma vez. */}
      <div className="max-w-2xl space-y-6">
        <div hidden={step !== "inicio"}>
          <Section title="Início" description="Identificação, vídeo e link público do webinário.">
            <Field label="Título">
              <input name="titulo" defaultValue={values.titulo} required className={inputClass} />
            </Field>

            <Field label="URL amigável (parte da URL pública)">
              <UrlAmigavelField defaultValue={values.slug} />
            </Field>

            <Field label="URL do vídeo (YouTube)">
              <input
                name="videoUrl"
                defaultValue={values.videoUrl}
                required
                placeholder="https://www.youtube.com/watch?v=..."
                className={inputClass}
              />
            </Field>

            <Field label="Duração do vídeo (segundos)">
              <input
                type="number"
                name="videoDurationSeconds"
                defaultValue={values.videoDurationSeconds}
                required
                min={1}
                className={inputClass}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="ativo" defaultChecked={values.ativo} className="h-4 w-4" />
              Webinário ativo (aparece pra quem acessa a página pública)
            </label>

            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="sincronizarVideoComHorario"
                  defaultChecked={values.sincronizarVideoComHorario}
                  className="h-4 w-4"
                />
                Sincronizar vídeo com o horário de início (recomendado)
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Ligado: o vídeo pula pro ponto certo do relógio real (efeito &quot;ao vivo&quot; de verdade).
                Desligado: o vídeo sempre começa do zero pra cada pessoa, mas a sala continua abrindo/fechando nos
                horários configurados.
              </p>
            </div>

            {webinarId && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">Links do webinário</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Sala principal, magic link, just in time, sala teste e replay ficam na etapa{" "}
                  <Link
                    href={`/admin/webinars/${webinarId}/links`}
                    className="font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Links
                  </Link>
                  .
                </p>
              </div>
            )}
          </Section>
        </div>

        <div hidden={step !== "agendamento"}>
          <Section
            title="Agendamento"
            description="Como e quando as sessões acontecem pra quem acessa a página pública."
          >
            <Field label="Tipo de agendamento">
              <select
                name="tipoAgendamento"
                value={tipoAgendamento}
                onChange={(e) => setTipoAgendamento(e.target.value as TipoAgendamento)}
                className={inputClass}
              >
                <option value="recorrente">Recorrente (a cada X minutos)</option>
                <option value="fixo">Fixo (horários do dia)</option>
                <option value="agendado">Agendado (data e hora específicas)</option>
                <option value="just_in_time">Just-in-time (X min após cadastro)</option>
              </select>
            </Field>

            {tipoAgendamento === "recorrente" && (
              <Field label="Intervalo de recorrência (minutos)">
                <input
                  type="number"
                  name="intervaloRecorrenciaMinutos"
                  defaultValue={values.intervaloRecorrenciaMinutos ?? 60}
                  min={1}
                  className={inputClass}
                />
              </Field>
            )}

            {tipoAgendamento === "fixo" && (
              <Field label="Horários fixos do dia (separados por vírgula, ex: 10:00, 14:00, 19:00)">
                <input name="horariosFixos" defaultValue={values.horariosFixos.join(", ")} className={inputClass} />
              </Field>
            )}

            {tipoAgendamento === "agendado" && (
              <>
                <Field label="Data e hora de início">
                  <input
                    type="datetime-local"
                    name="agendadoDataHoraInicio"
                    defaultValue={values.agendadoDataHoraInicio}
                    required
                    className={inputClass}
                  />
                </Field>

                <Field label="Repetir">
                  <select
                    name="agendadoRepeticao"
                    value={repeticao}
                    onChange={(e) => setRepeticao(e.target.value as RepeticaoAgendado)}
                    className={inputClass}
                  >
                    <option value="nenhuma">Não repetir (sessão única)</option>
                    <option value="diaria">Diariamente</option>
                    <option value="semanal">Semanalmente</option>
                  </select>
                </Field>

                {repeticao !== "nenhuma" && (
                  <Field label="Data e hora de finalização (a repetição para depois disso)">
                    <input
                      type="datetime-local"
                      name="agendadoDataHoraFim"
                      defaultValue={values.agendadoDataHoraFim}
                      required
                      className={inputClass}
                    />
                  </Field>
                )}
              </>
            )}

            {tipoAgendamento === "just_in_time" && (
              <Field label="Começa X minutos após o cadastro do lead">
                <input
                  type="number"
                  name="delayJustInTimeMinutos"
                  defaultValue={values.delayJustInTimeMinutos ?? 10}
                  min={0}
                  className={inputClass}
                />
              </Field>
            )}
          </Section>
        </div>

        <div hidden={step !== "visual"}>
          <Section title="Visual da sala" description="Escolha a estrutura e personalize a identidade visual exibida para o público.">
            <fieldset>
              <legend className="mb-2 text-sm text-gray-500">Formato da sala</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ThemeOption
                  value="hotwebinar"
                  checked={temaSala === "hotwebinar"}
                  onChange={() => setTemaSala("hotwebinar")}
                  title="Padrão Hotwebinar"
                  description="Título no topo, player dominante e chat com abas."
                />
                <ThemeOption
                  value="youtube"
                  checked={temaSala === "youtube"}
                  onChange={() => setTemaSala("youtube")}
                  title="Estilo YouTube"
                  description="Controles familiares, título abaixo e chat contínuo."
                />
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              <ColorField label="Cor principal" name="corPrimaria" value={corPrimaria} onChange={setCorPrimaria} />
              <ColorField label="Cor de fundo" name="corFundo" value={corFundo} onChange={setCorFundo} />
              <ColorField label="Cor do texto" name="corTexto" value={corTexto} onChange={setCorTexto} />
            </div>

            <Field label="Fonte do Google Fonts">
              <select
                name="fonteSala"
                value={fonteSala}
                onChange={(event) => setFonteSala(event.target.value as FonteSala)}
                className={inputClass}
              >
                {FONTES_SALA.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
            </Field>

            <VisualPreview
              tema={temaSala}
              corPrimaria={corPrimaria}
              corFundo={corFundo}
              corTexto={corTexto}
              fonte={fonteSala}
            />
          </Section>
        </div>

        <div hidden={step !== "oferta"}>
          <Section title="Oferta" description="Tudo que aparece no bloco de oferta, logo abaixo do vídeo.">
            <Field label="Nome da oferta (rótulo curto, opcional)">
              <input
                name="ofertaNome"
                defaultValue={values.ofertaNome}
                placeholder="Ex: Mentoria VIP"
                className={inputClass}
              />
            </Field>

            <Field label="Título da oferta (opcional)">
              <input
                name="ofertaTitulo"
                defaultValue={values.ofertaTitulo}
                placeholder="Ex: Transforme seu negócio em 90 dias"
                className={inputClass}
              />
            </Field>

            <Field label="Imagem da oferta (URL, opcional)">
              <input
                name="ofertaImagemUrl"
                defaultValue={values.ofertaImagemUrl}
                placeholder="https://.../imagem.jpg"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Aparece em (segundos do vídeo)">
                <input
                  type="number"
                  name="pitchTimestampSeconds"
                  defaultValue={values.pitchTimestampSeconds}
                  required
                  min={0}
                  className={inputClass}
                />
              </Field>
              <Field label="Some em (segundos do vídeo, opcional)">
                <input
                  type="number"
                  name="ctaDesaparecerSegundos"
                  defaultValue={values.ctaDesaparecerSegundos ?? ""}
                  min={0}
                  placeholder="deixe em branco pra ficar até o fim"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Texto do botão de CTA">
              <input name="ctaTexto" defaultValue={values.ctaTexto} required className={inputClass} />
            </Field>

            <Field label="Link do CTA (checkout, WhatsApp, etc)">
              <input
                name="ctaLink"
                defaultValue={values.ctaLink}
                required
                placeholder="https://..."
                className={inputClass}
              />
            </Field>

            <Field label="Texto de urgência (aparece junto com o botão, opcional)">
              <input
                name="ofertaDescricao"
                defaultValue={values.ofertaDescricao}
                placeholder="Ex: Oferta válida só durante essa sessão"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço original (opcional, mostrado riscado)">
                <input
                  type="number"
                  step="0.01"
                  name="precoOriginal"
                  defaultValue={values.precoOriginal ?? ""}
                  min={0}
                  placeholder="497.00"
                  className={inputClass}
                />
              </Field>
              <Field label="Preço da oferta (opcional)">
                <input
                  type="number"
                  step="0.01"
                  name="precoOferta"
                  defaultValue={values.precoOferta ?? ""}
                  min={0}
                  placeholder="197.00"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Contagem regressiva de urgência (minutos a partir do CTA, opcional)">
              <input
                type="number"
                name="ctaCountdownMinutos"
                defaultValue={values.ctaCountdownMinutos ?? ""}
                min={1}
                placeholder="ex: 15 (deixe em branco pra não mostrar)"
                className={inputClass}
              />
            </Field>
          </Section>
        </div>

        <div hidden={step !== "audiencia"}>
          <Section title="Audiência" description="Faixa do contador de espectadores fake exibido na sala.">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mínimo">
                <input
                  type="number"
                  name="audienciaFakeMin"
                  defaultValue={values.audienciaFakeMin ?? ""}
                  min={1}
                  placeholder="ex: 80"
                  className={inputClass}
                />
              </Field>
              <Field label="Máximo">
                <input
                  type="number"
                  name="audienciaFakeMax"
                  defaultValue={values.audienciaFakeMax ?? ""}
                  min={1}
                  placeholder="ex: 250"
                  className={inputClass}
                />
              </Field>
            </div>
            <p className="text-xs text-gray-500">Deixe os dois em branco pra usar uma faixa padrão (60-240).</p>
          </Section>
        </div>

        <div hidden={step !== "integracoes"}>
          <Section title="Integrações" description="Ferramentas externas conectadas à página do webinário.">
            <Field label="Meta Pixel ID (Facebook Ads)">
              <input
                name="metaPixelId"
                defaultValue={values.metaPixelId}
                placeholder="ex: 1234567890123456"
                className={inputClass}
              />
            </Field>
            <p className="text-xs text-gray-500">
              Quando preenchido, o Pixel é carregado na página da sala e dispara PageView no carregamento e Lead no
              clique do CTA.
            </p>
          </Section>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleVoltar}
            disabled={stepIndex === 0}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-0"
          >
            Voltar
          </button>

          {isLastStep ? (
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
            >
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinuar}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function ThemeOption({
  value,
  checked,
  onChange,
  title,
  description,
}: {
  value: TemaSala;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`group cursor-pointer rounded-xl border p-3 transition duration-200 ${
        checked
          ? "border-emerald-500 bg-emerald-50 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]"
          : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
      }`}
    >
      <input type="radio" name="temaSala" value={value} checked={checked} onChange={onChange} className="sr-only" />
      <div className={`mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white ${value === "youtube" ? "p-1.5" : "p-2"}`}>
        <div className="grid aspect-[2.1/1] grid-cols-[1fr_32%] gap-1.5">
          <div className="relative rounded bg-slate-800">
            <span className="absolute left-1 top-1 h-1.5 w-7 rounded-sm bg-rose-500" />
            {value === "youtube" && <span className="absolute inset-x-1 bottom-1 h-0.5 rounded bg-rose-500" />}
          </div>
          <div className="rounded border border-gray-200 bg-gray-50">
            <div className="m-1 h-1.5 rounded bg-gray-200" />
          </div>
        </div>
        {value === "youtube" && <div className="mt-1.5 h-2 w-2/3 rounded bg-gray-200" />}
      </div>
      <span className="block text-sm font-semibold text-gray-900">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-gray-500">{description}</span>
    </label>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";

  return (
    <Field label={label}>
      <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-gray-100 focus-within:border-emerald-500">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Selecionar ${label.toLowerCase()}`}
          className="h-10 w-12 cursor-pointer border-0 bg-transparent p-1"
        />
        <input
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          maxLength={7}
          className="min-w-0 flex-1 border-l border-gray-300 bg-transparent px-2 text-xs font-medium uppercase outline-none"
        />
      </div>
    </Field>
  );
}

function VisualPreview({
  tema,
  corPrimaria,
  corFundo,
  corTexto,
  fonte,
}: {
  tema: TemaSala;
  corPrimaria: string;
  corFundo: string;
  corTexto: string;
  fonte: FonteSala;
}) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(corPrimaria) ? corPrimaria : VISUAL_DEFAULTS.corPrimaria;
  const background = /^#[0-9a-fA-F]{6}$/.test(corFundo) ? corFundo : VISUAL_DEFAULTS.corFundo;
  const foreground = /^#[0-9a-fA-F]{6}$/.test(corTexto) ? corTexto : VISUAL_DEFAULTS.corTexto;
  const style = {
    "--room-accent": accent,
    "--room-accent-contrast": getContrastColor(accent),
    "--room-background": background,
    "--room-foreground": foreground,
  } as CSSProperties;

  return (
    <div>
      <p className="mb-2 text-sm text-gray-500">Prévia rápida</p>
      <div
        className="webinar-room min-h-0 overflow-hidden rounded-xl border border-gray-200 p-3 shadow-sm"
        data-room-font={fonte}
        data-theme={tema}
        style={style}
      >
        {tema === "hotwebinar" && <p className="mb-2 text-sm font-bold">Título do seu webinar</p>}
        <div className="grid grid-cols-[1fr_34%] gap-2">
          <div>
            <div className="relative aspect-video overflow-hidden rounded-md bg-[#15171c]">
              <span className="room-accent-bg absolute left-1.5 top-1.5 rounded px-2 py-1 text-[8px] font-semibold">Replay</span>
              {tema === "youtube" && <span className="room-accent-bg absolute inset-x-2 bottom-2 h-0.5 rounded-full" />}
            </div>
            {tema === "youtube" && <p className="mt-2 text-sm font-bold">Título do seu webinar</p>}
          </div>
          <div className="room-surface overflow-hidden rounded-md border">
            <div className="border-b p-2 text-[8px] font-semibold" style={{ borderColor: "var(--room-border)" }}>Chat ao vivo</div>
            <div className="space-y-1.5 p-2">
              {["70%", "88%", "58%"].map((width) => <span key={width} className="block h-1 rounded bg-current opacity-15" style={{ width }} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UrlAmigavelField({ defaultValue }: { defaultValue: string }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-gray-300 bg-gray-100 focus-within:border-emerald-500">
      <span className="flex items-center whitespace-nowrap border-r border-gray-300 bg-gray-200 px-3 text-sm text-gray-500">
        {origin || "seu-dominio"}/
      </span>
      <input
        name="slug"
        defaultValue={defaultValue}
        placeholder="deixe em branco pra gerar a partir do título"
        className="w-full bg-gray-100 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 mt-0.5 text-xs text-gray-500">{description}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-500">{label}</label>
      {children}
    </div>
  );
}
