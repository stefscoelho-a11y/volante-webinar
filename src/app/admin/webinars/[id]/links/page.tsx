import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WebinarStepper } from "@/components/admin/WebinarStepper";
import { WebinarLinksPanel } from "@/components/admin/WebinarLinksPanel";
import { LinksAcessoConfigForm } from "@/components/admin/LinksAcessoConfigForm";
import { justInTimeDisponivel } from "@/lib/linksAcesso";
import { toDatetimeLocalBrasilia } from "@/lib/scheduling";
import { regenerarTokenSalaTeste, salvarConfigLinks } from "./actions";

export const dynamic = "force-dynamic";

type LinksPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
};

export default async function LinksPage({ params, searchParams }: LinksPageProps) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) notFound();

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-semibold">{webinar.titulo}</h1>
      <WebinarStepper webinarId={webinar.id} activeKey="links" />

      <div className="max-w-2xl space-y-6 pb-16">
        {salvo && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-2 text-sm text-orange-700">
            Configurações salvas.
          </div>
        )}
        {!webinar.ativo && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm text-amber-800">
            Este webinário está inativo: os links públicos mostram página não encontrada. Só a sala teste funciona.
          </div>
        )}

        <WebinarLinksPanel
          slug={webinar.slug}
          tokenSalaTeste={webinar.tokenSalaTeste}
          justInTimeDisponivel={justInTimeDisponivel(webinar)}
          replayAtivo={webinar.replayAtivo}
          regenerarTokenAction={regenerarTokenSalaTeste.bind(null, webinar.id)}
        />

        <LinksAcessoConfigForm
          action={salvarConfigLinks.bind(null, webinar.id)}
          tipoAgendamento={webinar.tipoAgendamento}
          values={{
            exigirCadastro: webinar.exigirCadastro,
            justInTimeAtivo: webinar.justInTimeAtivo,
            delayJustInTimeMinutos: webinar.delayJustInTimeMinutos,
            replayAtivo: webinar.replayAtivo,
            replayLiberarEm: toDatetimeLocalBrasilia(webinar.replayLiberarEm),
            replayExpirarEm: toDatetimeLocalBrasilia(webinar.replayExpirarEm),
            replayDuracaoHoras: webinar.replayDuracaoHoras,
          }}
        />
      </div>
    </div>
  );
}
