import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { ORIGENS_LEAD } from "@/lib/linksAcesso";
import { TIPOS_EVENTO_FUNIL, type TipoEventoFunil } from "@/lib/funil";

export const dynamic = "force-dynamic";

type FunilPageProps = {
  searchParams: Promise<{ webinarId?: string; from?: string; to?: string; range?: string }>;
};

const ETAPAS: { tipo: TipoEventoFunil; label: string; desc: string }[] = [
  { tipo: "entrou_sala", label: "Entraram na sala", desc: "Abriram /:slug/sala ou /:slug/replay" },
  { tipo: "chegou_pitch", label: "Chegaram no pitch", desc: "Assistiram até o timestamp do CTA" },
  { tipo: "clicou_cta", label: "Clicaram no CTA", desc: "Clicaram no botão da oferta" },
];

function resolveRange(params: { from?: string; to?: string; range?: string }) {
  const now = new Date();

  if (params.from && params.to) {
    const from = new Date(`${params.from}T00:00:00`);
    const to = new Date(`${params.to}T23:59:59`);
    return { from, to, activeKey: "personalizado" as const };
  }

  const range = params.range === "hoje" || params.range === "30d" ? params.range : "7d";
  const days = range === "30d" ? 30 : range === "hoje" ? 1 : 7;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to: now, activeKey: range };
}

export default async function FunilPage({ searchParams }: FunilPageProps) {
  const params = await searchParams;
  const { from, to, activeKey } = resolveRange(params);
  const webinars = await prisma.webinar.findMany({ orderBy: { criadoEm: "desc" } });
  const webinarSelecionado = params.webinarId ? webinars.find((w) => w.id === params.webinarId) : webinars[0];

  const [eventosPorTipo, cadastrosPorOrigem] = webinarSelecionado
    ? await Promise.all([
        prisma.eventoFunil.groupBy({
          by: ["tipo"],
          where: { webinarId: webinarSelecionado.id, criadoEm: { gte: from, lte: to } },
          _count: { _all: true },
        }),
        prisma.lead.groupBy({
          by: ["origem"],
          where: { webinarId: webinarSelecionado.id, entrouEm: { gte: from, lte: to } },
          _count: { _all: true },
        }),
      ])
    : [[], []];

  const totalPorEtapa = Object.fromEntries(TIPOS_EVENTO_FUNIL.map((tipo) => [tipo, 0])) as Record<TipoEventoFunil, number>;
  for (const item of eventosPorTipo) totalPorEtapa[item.tipo as TipoEventoFunil] = item._count._all;
  const maiorEtapa = Math.max(1, ...Object.values(totalPorEtapa));

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Funil de Conversão</h1>
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="range" value={activeKey === "personalizado" ? "" : activeKey} />
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
            <div className="mb-5">
              <PeriodSelector
                webinarId={webinarSelecionado.id}
                activeKey={activeKey}
                from={params.from}
                to={params.to}
              />
            </div>

            <div className="space-y-3">
              {ETAPAS.map((etapa, index) => {
                const total = totalPorEtapa[etapa.tipo];
                const largura = Math.round((total / maiorEtapa) * 100);
                return (
                  <div key={etapa.tipo} className="rounded-xl border border-gray-200 bg-white p-4">
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
                      <span className="text-2xl font-semibold tabular-nums text-gray-900">{total}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${total > 0 ? largura : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Cada etapa conta visitantes únicos no período (identificados por navegador, com ou sem cadastro) - uma
              pessoa que entra em sessões diferentes do mesmo webinário conta de novo em cada sessão.
            </p>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900">Cadastros por link</h2>
              <p className="mb-3 mt-0.5 text-xs text-gray-500">
                Por qual link cada participante chegou pela primeira vez, no mesmo período. So conta quem preencheu
                cadastro ou entrou pelo chat - webinários sem "exigir cadastro" ligado têm visitantes que nunca geram
                essa linha, mas aparecem normalmente nas etapas acima.
              </p>
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

function PeriodSelector({
  webinarId,
  activeKey,
  from,
  to,
}: {
  webinarId: string;
  activeKey: string;
  from?: string;
  to?: string;
}) {
  const presets = [
    { key: "hoje", label: "Hoje" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-gray-200">
        {presets.map((preset) => (
          <Link
            key={preset.key}
            href={`/admin/funil?webinarId=${webinarId}&range=${preset.key}`}
            className={`px-3 py-1.5 text-sm transition ${
              activeKey === preset.key
                ? "bg-orange-500 font-semibold text-neutral-950"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {preset.label}
          </Link>
        ))}
      </div>
      <form method="get" className="flex items-center gap-1.5">
        <input type="hidden" name="webinarId" value={webinarId} />
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
        />
        <span className="text-xs text-gray-400">até</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
        />
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
        >
          Aplicar
        </button>
      </form>
    </div>
  );
}
