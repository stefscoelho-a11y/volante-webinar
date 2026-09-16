import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WebinarStepper } from "@/components/admin/WebinarStepper";
import { CanalOfertaCard } from "@/components/admin/CanalOfertaCard";
import { CanalOfertaForm, type WebinarBaseOferta } from "@/components/admin/CanalOfertaForm";
import { CampoTempo } from "@/components/admin/CampoTempo";
import { justInTimeDisponivel } from "@/lib/linksAcesso";
import { atualizarCanal, criarCanal, excluirCanal, salvarOferta } from "./actions";

export const dynamic = "force-dynamic";

type OfertaPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500";

export default async function OfertaPage({ params, searchParams }: OfertaPageProps) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    include: { canais: { orderBy: { criadoEm: "asc" } } },
  });
  if (!webinar) notFound();

  const webinarBase: WebinarBaseOferta = {
    ofertaNome: webinar.ofertaNome,
    ofertaTitulo: webinar.ofertaTitulo,
    ofertaImagemUrl: webinar.ofertaImagemUrl,
    ofertaDescricao: webinar.ofertaDescricao,
    precoOriginal: webinar.precoOriginal,
    precoOferta: webinar.precoOferta,
    precoParcelado: webinar.precoParcelado,
    ctaTexto: webinar.ctaTexto,
    ctaLink: webinar.ctaLink,
    ctaCountdownMinutos: webinar.ctaCountdownMinutos,
    ctaDesaparecerSegundos: webinar.ctaDesaparecerSegundos,
    metaPixelId: webinar.metaPixelId,
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-semibold">{webinar.titulo}</h1>
      <WebinarStepper webinarId={webinar.id} activeKey="oferta" />

      <div className="max-w-2xl space-y-6 pb-16">
        {salvo && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-700">
            Oferta salva.
          </div>
        )}

        <form action={salvarOferta.bind(null, webinar.id)} className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Oferta principal</h2>
          <p className="mb-4 mt-0.5 text-xs text-gray-500">
            Tudo que aparece no bloco de oferta, logo abaixo do vídeo. É a oferta padrão de quem entra sem um canal
            específico - e a base que os canais de oferta, logo abaixo, podem sobrescrever campo a campo.
          </p>

          <div className="space-y-4">
            <Field label="Nome da oferta (rótulo curto, opcional)">
              <input
                name="ofertaNome"
                defaultValue={webinar.ofertaNome ?? ""}
                placeholder="Ex: Mentoria VIP"
                className={inputClass}
              />
            </Field>

            <Field label="Título da oferta (opcional)">
              <input
                name="ofertaTitulo"
                defaultValue={webinar.ofertaTitulo ?? ""}
                placeholder="Ex: Transforme seu negócio em 90 dias"
                className={inputClass}
              />
            </Field>

            <Field label="Imagem da oferta (URL, opcional)">
              <input
                name="ofertaImagemUrl"
                defaultValue={webinar.ofertaImagemUrl ?? ""}
                placeholder="https://.../imagem.jpg"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Aparece em (hh:mm:ss do vídeo)">
                <CampoTempo
                  name="pitchTimestampSeconds"
                  valorInicial={webinar.pitchTimestampSeconds}
                  obrigatorio
                  placeholder="00:05:00"
                  className={inputClass}
                />
              </Field>
              <Field label="Some em (hh:mm:ss, opcional)">
                <CampoTempo
                  name="ctaDesaparecerSegundos"
                  valorInicial={webinar.ctaDesaparecerSegundos}
                  placeholder="em branco: fica até o fim"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Texto do botão de CTA">
              <input name="ctaTexto" defaultValue={webinar.ctaTexto} required className={inputClass} />
            </Field>

            <Field label="Link do CTA (checkout, WhatsApp, etc)">
              <input
                name="ctaLink"
                defaultValue={webinar.ctaLink}
                required
                placeholder="https://..."
                className={inputClass}
              />
            </Field>

            <Field label="Texto de urgência (aparece junto com o botão, opcional)">
              <input
                name="ofertaDescricao"
                defaultValue={webinar.ofertaDescricao ?? ""}
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
                  defaultValue={webinar.precoOriginal ?? ""}
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
                  defaultValue={webinar.precoOferta ?? ""}
                  min={0}
                  placeholder="197.00"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Preço parcelado (texto livre, opcional)">
              <input
                name="precoParcelado"
                defaultValue={webinar.precoParcelado ?? ""}
                placeholder="Ex: 10x de R$ 19,90"
                className={inputClass}
              />
            </Field>

            <Field label="Contagem regressiva de urgência (minutos a partir do CTA, opcional)">
              <input
                type="number"
                name="ctaCountdownMinutos"
                defaultValue={webinar.ctaCountdownMinutos ?? ""}
                min={1}
                placeholder="ex: 15 (deixe em branco pra não mostrar)"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
            >
              Salvar oferta
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Canais de oferta</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Crie um canal para cada lugar em que divulga esse webinário (ex: live tráfego, live orgânico, sms
            orgânico) e defina uma oferta diferente para cada um. Cada canal ganha seu próprio conjunto de links
            padrão (sala, just in time, teste, replay) - o que não for preenchido aqui usa a oferta principal acima.
          </p>
        </div>

        {webinar.canais.length > 0 && (
          <div className="space-y-3">
            {webinar.canais.map((canal) => (
              <CanalOfertaCard
                key={canal.id}
                canal={canal}
                slugWebinar={webinar.slug}
                tokenSalaTeste={webinar.tokenSalaTeste}
                justInTimeDisponivel={justInTimeDisponivel(webinar)}
                replayAtivo={webinar.replayAtivo}
                webinarBase={webinarBase}
                atualizarAction={atualizarCanal.bind(null, webinar.id, canal.id)}
                excluirAction={excluirCanal.bind(null, webinar.id, canal.id)}
              />
            ))}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Novo canal</h2>
          <CanalOfertaForm action={criarCanal.bind(null, webinar.id)} botao="Criar canal" webinarBase={webinarBase} />
        </div>
      </div>
    </div>
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
