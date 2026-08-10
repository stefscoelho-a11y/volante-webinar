import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WebinarForm } from "@/components/admin/WebinarForm";
import type { WebinarStepKey } from "@/components/admin/WebinarStepper";
import { toDatetimeLocalValue, type RepeticaoAgendado, type TipoAgendamento } from "@/lib/scheduling";
import { updateWebinar } from "../../actions";

export const dynamic = "force-dynamic";

const STEP_KEYS: WebinarStepKey[] = ["inicio", "agendamento", "oferta", "audiencia", "integracoes"];

type EditarWebinarPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function EditarWebinarPage({ params, searchParams }: EditarWebinarPageProps) {
  const { id } = await params;
  const { step } = await searchParams;
  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) notFound();

  const initialStep = STEP_KEYS.includes(step as WebinarStepKey) ? (step as WebinarStepKey) : "inicio";

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-semibold">{webinar.titulo}</h1>
      <WebinarForm
        webinarId={webinar.id}
        initialStep={initialStep}
        action={updateWebinar.bind(null, webinar.id)}
        submitLabel="Salvar alterações"
        initialValues={{
          titulo: webinar.titulo,
          slug: webinar.slug,
          videoUrl: webinar.videoUrl ?? "",
          videoDurationSeconds: webinar.videoDurationSeconds,
          pitchTimestampSeconds: webinar.pitchTimestampSeconds,
          ctaTexto: webinar.ctaTexto,
          ctaLink: webinar.ctaLink,
          ctaDesaparecerSegundos: webinar.ctaDesaparecerSegundos,
          tipoAgendamento: webinar.tipoAgendamento as TipoAgendamento,
          sincronizarVideoComHorario: webinar.sincronizarVideoComHorario,
          ativo: webinar.ativo,
          horariosFixos: Array.isArray(webinar.horariosFixos) ? (webinar.horariosFixos as string[]) : [],
          intervaloRecorrenciaMinutos: webinar.intervaloRecorrenciaMinutos,
          delayJustInTimeMinutos: webinar.delayJustInTimeMinutos,
          agendadoDataHoraInicio: toDatetimeLocalValue(webinar.agendadoDataHoraInicio),
          agendadoDataHoraFim: toDatetimeLocalValue(webinar.agendadoDataHoraFim),
          agendadoRepeticao: (webinar.agendadoRepeticao as RepeticaoAgendado) ?? "nenhuma",
          ofertaNome: webinar.ofertaNome ?? "",
          ofertaTitulo: webinar.ofertaTitulo ?? "",
          ofertaImagemUrl: webinar.ofertaImagemUrl ?? "",
          ofertaDescricao: webinar.ofertaDescricao ?? "",
          precoOriginal: webinar.precoOriginal,
          precoOferta: webinar.precoOferta,
          ctaCountdownMinutos: webinar.ctaCountdownMinutos,
          metaPixelId: webinar.metaPixelId ?? "",
          audienciaFakeMin: webinar.audienciaFakeMin,
          audienciaFakeMax: webinar.audienciaFakeMax,
        }}
      />
    </div>
  );
}
