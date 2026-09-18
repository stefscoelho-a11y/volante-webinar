import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WebinarStepper } from "@/components/admin/WebinarStepper";
import { AgenteConfigForm } from "@/components/admin/AgenteConfigForm";
import { salvarAgente } from "./actions";

export const dynamic = "force-dynamic";

type AgentePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
};

export default async function AgentePage({ params, searchParams }: AgentePageProps) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) notFound();

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-semibold">{webinar.titulo}</h1>
      <WebinarStepper webinarId={webinar.id} activeKey="agente" />

      <div className="max-w-2xl space-y-6 pb-16">
        {salvo && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-2 text-sm text-orange-700">
            Agente salvo.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Agente de suporte por IA</h2>
          <p className="mb-4 mt-0.5 text-xs text-gray-500">
            Um chat de suporte flutuante (tipo Jivochat) aparece no canto da sala, tira dúvidas de quem está
            assistindo e, quando o vídeo chega no pitch, aborda a pessoa automaticamente pra ajudar a vender - de
            forma sugestiva, nunca insistente.
          </p>

          <AgenteConfigForm
            action={salvarAgente.bind(null, webinar.id)}
            values={{
              agenteIaAtivo: webinar.agenteIaAtivo,
              agenteNome: webinar.agenteNome,
              agenteFotoUrl: webinar.agenteFotoUrl,
              agenteInformacoesProduto: webinar.agenteInformacoesProduto,
              agenteTom: webinar.agenteTom,
              agenteRoteiroAula: webinar.agenteRoteiroAula,
            }}
          />
        </div>
      </div>
    </div>
  );
}
