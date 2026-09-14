import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { ORIGENS_LEAD } from "@/lib/linksAcesso";

export const dynamic = "force-dynamic";

type FunilPageProps = {
  searchParams: Promise<{ webinarId?: string }>;
};

const ETAPAS = [
  { label: "Visitantes da página de inscrição", desc: "Quem chegou em /:slug" },
  { label: "Entraram na sala", desc: "Chegaram em /:slug/sala" },
  { label: "Chegaram no pitch", desc: "Assistiram até o timestamp do CTA" },
  { label: "Clicaram no CTA", desc: "Clicaram no botão da oferta" },
];

export default async function FunilPage({ searchParams }: FunilPageProps) {
  const { webinarId } = await searchParams;
  const webinars = await prisma.webinar.findMany({ orderBy: { criadoEm: "desc" } });
  const webinarSelecionado = webinarId ? webinars.find((w) => w.id === webinarId) : webinars[0];
  const cadastrosPorOrigem = webinarSelecionado
    ? await prisma.lead.groupBy({
        by: ["origem"],
        where: { webinarId: webinarSelecionado.id },
        _count: { _all: true },
      })
    : [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Funil de Conversão</h1>
          <form method="get" className="flex items-center gap-2">
            <select
              name="webinarId"
              defaultValue={webinarSelecionado?.id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800"
            >
              {webinars.map((webinar) => (
                <option key={webinar.id} value={webinar.id}>
                  {webinar.titulo}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Ver
            </button>
          </form>
        </div>

        {!webinarSelecionado ? (
          <p className="text-gray-500">Crie um webinário primeiro pra ver o funil dele aqui.</p>
        ) : (
          <>
            <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-800">
              O rastreamento de visitas, entradas na sala, chegada no pitch e cliques no CTA ainda não foi
              implementado — por isso as etapas abaixo aparecem sem número. Assim que os eventos forem
              instrumentados, esse painel passa a mostrar os valores reais automaticamente.
            </div>

            <div className="space-y-3">
              {ETAPAS.map((etapa, index) => (
                <div key={etapa.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{etapa.label}</p>
                        <p className="text-xs text-gray-500">{etapa.desc}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-semibold text-gray-500">—</span>
                  </div>
                  {/* barra do funil: largura fixa por enquanto (sem dado real ainda) */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gray-300"
                      style={{ width: `${100 - index * 20}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900">Cadastros por link</h2>
              <p className="mb-3 mt-0.5 text-xs text-gray-500">Por qual link cada participante chegou pela primeira vez.</p>
              <div className="space-y-2">
                {Object.entries(ORIGENS_LEAD).map(([origem, label]) => {
                  const total = cadastrosPorOrigem.find((item) => item.origem === origem)?._count._all ?? 0;
                  return (
                    <div key={origem} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold tabular-nums text-gray-900">{total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
