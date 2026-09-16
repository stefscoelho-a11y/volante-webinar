import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { RetentionChartExample } from "@/components/admin/RetentionChartExample";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ from?: string; to?: string; range?: string }>;
};

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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const { from, to, activeKey } = resolveRange(params);

  const [totalWebinars, webinarsAtivos, leadsNoPeriodo] = await Promise.all([
    prisma.webinar.count(),
    prisma.webinar.count({ where: { ativo: true } }),
    // Convidados do chat nao deixaram dados, entao nao contam como cadastro
    prisma.lead.count({ where: { entrouEm: { gte: from, lte: to }, origem: { not: "convidado" } } }),
  ]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <PeriodSelector activeKey={activeKey} from={params.from} to={params.to} />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Webinários ativos" value={String(webinarsAtivos)} hint={`${totalWebinars} no total`} />
          <StatCard label="Cadastros no período" value={String(leadsNoPeriodo)} hint="Todos os links de acesso" />
          <StatCard label="Receita no período" value="—" hint="Em breve" placeholder />
          <StatCard label="Taxa de conversão" value="—" hint="Em breve" placeholder />
        </div>

        <RetentionChartExample />

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Quer ver o funil completo de conversão de um webinário específico?{" "}
            <Link href="/admin/funil" className="font-medium text-orange-600 hover:text-orange-700">
              Acesse o painel de funil
            </Link>
            .
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

function PeriodSelector({
  activeKey,
  from,
  to,
}: {
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
            href={`/admin?range=${preset.key}`}
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
