import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { justInTimeDisponivel } from "@/lib/linksAcesso";
import { redirecionarSeMagicLink } from "@/lib/leads";
import { EntradaJustInTime } from "../EntradaJustInTime";

export const dynamic = "force-dynamic";

type JustInTimePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Link "Sala com just in time": disponivel pra qualquer tipo de agendamento quando habilitado. */
export default async function JustInTimePage({ params, searchParams }: JustInTimePageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const webinar = await prisma.webinar.findUnique({ where: { slug } });
  if (!webinar || !webinar.ativo || !justInTimeDisponivel(webinar)) notFound();

  redirecionarSeMagicLink(slug, "jit", query);

  return <EntradaJustInTime webinar={webinar} via="jit" query={query} />;
}
