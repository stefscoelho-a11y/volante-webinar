import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgendadoSessionStart, type RepeticaoAgendado } from "@/lib/scheduling";
import { lerUtms, webinarPath } from "@/lib/linksAcesso";
import { getLeadAtual, redirecionarSeMagicLink } from "@/lib/leads";
import { FixoScheduleSelector } from "@/components/FixoScheduleSelector";
import { CadastroForm } from "@/components/CadastroForm";
import { AvisoPagina } from "@/components/AvisoPagina";
import { EntradaJustInTime } from "./EntradaJustInTime";
import { cadastrar } from "./actions";

export const dynamic = "force-dynamic";

type SalaPrincipalPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Sala principal: entrada publica do webinar. O fluxo segue o tipo de
 * agendamento; com "exigir cadastro" ligado, pede nome e email antes. Com
 * nome e email na URL (magic link), o cadastro e feito automaticamente.
 */
export default async function SalaPrincipalPage({ params, searchParams }: SalaPrincipalPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const webinar = await prisma.webinar.findUnique({ where: { slug } });
  if (!webinar || !webinar.ativo) notFound();

  redirecionarSeMagicLink(slug, "principal", query);

  if (webinar.tipoAgendamento === "just_in_time") {
    return <EntradaJustInTime webinar={webinar} via="principal" query={query} />;
  }

  if (webinar.exigirCadastro && !(await getLeadAtual(webinar.id))) {
    return (
      <CadastroForm
        titulo={webinar.titulo}
        descricao="Preencha seus dados para entrar na sala."
        botao="Entrar na sala"
        action={cadastrar.bind(null, slug, "principal")}
        camposOcultos={lerUtms(query)}
      />
    );
  }

  if (webinar.tipoAgendamento === "recorrente") {
    // Sem escolha do participante: a sala calcula a sessao alcancavel mais
    // proxima (a de agora ou a proxima, com contagem regressiva).
    if (!webinar.intervaloRecorrenciaMinutos) notFound();
    redirect(webinarPath(slug, "sala"));
  }

  if (webinar.tipoAgendamento === "agendado") {
    if (!webinar.agendadoDataHoraInicio) notFound();
    const sessionStart = getAgendadoSessionStart(
      webinar.agendadoDataHoraInicio,
      (webinar.agendadoRepeticao as RepeticaoAgendado) ?? "nenhuma",
      webinar.agendadoDataHoraFim,
      webinar.videoDurationSeconds,
    );
    if (!sessionStart) {
      return <AvisoPagina titulo={webinar.titulo} mensagem="Este webinário não está mais disponível." />;
    }
    redirect(webinarPath(slug, "sala"));
  }

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
