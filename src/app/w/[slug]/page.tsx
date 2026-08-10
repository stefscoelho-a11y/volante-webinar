import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgendadoSessionStart, getSessaoRecorrenteAlcancavel, type RepeticaoAgendado } from "@/lib/scheduling";
import { FixoScheduleSelector } from "@/components/FixoScheduleSelector";
import { signUpJustInTime } from "./actions";

export const dynamic = "force-dynamic";

type EntryPageProps = { params: Promise<{ slug: string }> };

export default async function WebinarEntryPage({ params }: EntryPageProps) {
  const { slug } = await params;
  const webinar = await prisma.webinar.findUnique({ where: { slug } });
  if (!webinar || !webinar.ativo) notFound();

  if (webinar.tipoAgendamento === "recorrente") {
    // Recorrente nao precisa de escolha do usuario: calculamos a sessao
    // alcancavel mais proxima (a que esta rolando agora, ou a proxima) e
    // mandamos direto pra sala, que sabe mostrar contagem regressiva se
    // ainda nao comecou.
    if (!webinar.intervaloRecorrenciaMinutos) notFound();
    const sessionStart = getSessaoRecorrenteAlcancavel(
      webinar.intervaloRecorrenciaMinutos,
      webinar.videoDurationSeconds,
    );
    redirect(`/w/${slug}/sala?sessionStart=${encodeURIComponent(sessionStart.toISOString())}`);
  }

  if (webinar.tipoAgendamento === "agendado") {
    // Igual o recorrente: nao ha escolha do usuario, so calculamos a sessao
    // alcancavel (a de agora, ou a proxima ocorrencia) e mandamos pra sala.
    if (!webinar.agendadoDataHoraInicio) notFound();
    const sessionStart = getAgendadoSessionStart(
      webinar.agendadoDataHoraInicio,
      (webinar.agendadoRepeticao as RepeticaoAgendado) ?? "nenhuma",
      webinar.agendadoDataHoraFim,
      webinar.videoDurationSeconds,
    );
    if (!sessionStart) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center text-gray-900">
          <div>
            <h1 className="text-xl font-semibold">{webinar.titulo}</h1>
            <p className="mt-2 text-gray-500">Este webinario nao esta mais disponivel.</p>
          </div>
        </div>
      );
    }
    redirect(`/w/${slug}/sala?sessionStart=${encodeURIComponent(sessionStart.toISOString())}`);
  }

  if (webinar.tipoAgendamento === "fixo") {
    const horariosFixos = Array.isArray(webinar.horariosFixos) ? (webinar.horariosFixos as string[]) : [];
    return (
      <FixoScheduleSelector
        slug={slug}
        titulo={webinar.titulo}
        horariosFixos={horariosFixos}
        videoDurationSeconds={webinar.videoDurationSeconds}
      />
    );
  }

  // just_in_time: cadastro simples, a sala abre X minutos depois
  const delayMinutos = webinar.delayJustInTimeMinutos ?? 0;
  const signUpAction = signUpJustInTime.bind(null, webinar.id, slug, delayMinutos);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
      <form action={signUpAction} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="mb-1 text-xl font-semibold">{webinar.titulo}</h1>
        <p className="mb-4 text-sm text-gray-500">
          Cadastre-se e a sala abre em {delayMinutos} minuto{delayMinutos === 1 ? "" : "s"}.
        </p>

        <label className="mb-1 block text-sm text-gray-500" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="mb-3 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />

        <label className="mb-1 block text-sm text-gray-500" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mb-4 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />

        <button
          type="submit"
          className="w-full rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
        >
          Garantir minha vaga
        </button>
      </form>
    </div>
  );
}
