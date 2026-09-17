import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { RetentionChartExample } from "@/components/admin/RetentionChartExample";
import { RetentionChartReal } from "@/components/admin/RetentionChartReal";
import { SeletorWebinarRetencao } from "@/components/admin/SeletorWebinarRetencao";
import { WebinarCalendarioMes, type CelulaCalendario, type EventoCalendario } from "@/components/admin/WebinarCalendarioMes";
import { resumoAgenda } from "@/lib/webinarResumo";
import { extractYouTubeId } from "@/lib/youtube";
import { buscarRetencaoVideo } from "@/lib/youtubeAnalytics";
import {
  chaveDiaBrasilia,
  diaDaSemanaBrasilia,
  FUSO_BRASILIA,
  getOcorrenciasAgendadoNoIntervalo,
  parseDatetimeLocalBrasilia,
  toDatetimeLocalBrasilia,
  type RepeticaoAgendado,
} from "@/lib/scheduling";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ from?: string; to?: string; range?: string; mes?: string; video?: string }>;
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

const DIA_MS = 24 * 60 * 60 * 1000;

function primeiroDiaDoMesBrasilia(ano: number, mesIndex0: number): Date {
  return parseDatetimeLocalBrasilia(`${ano}-${String(mesIndex0 + 1).padStart(2, "0")}-01T00:00`)!;
}

function diasNoMes(ano: number, mesIndex0: number): number {
  return new Date(Date.UTC(ano, mesIndex0 + 1, 0)).getUTCDate();
}

function ultimoDiaDoMesBrasilia(ano: number, mesIndex0: number): Date {
  const dia = diasNoMes(ano, mesIndex0);
  return parseDatetimeLocalBrasilia(`${ano}-${String(mesIndex0 + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}T00:00`)!;
}

function resolveMes(mesParam: string | undefined): { ano: number; mesIndex0: number } {
  const match = mesParam ? /^(\d{4})-(\d{2})$/.exec(mesParam) : null;
  if (match) {
    const ano = Number(match[1]);
    const mesIndex0 = Number(match[2]) - 1;
    if (mesIndex0 >= 0 && mesIndex0 <= 11) return { ano, mesIndex0 };
  }
  const hoje = chaveDiaBrasilia(new Date());
  return { ano: Number(hoje.slice(0, 4)), mesIndex0: Number(hoje.slice(5, 7)) - 1 };
}

function mesAdjacente(ano: number, mesIndex0: number, delta: number): { ano: number; mesIndex0: number } {
  const total = ano * 12 + mesIndex0 + delta;
  return { ano: Math.floor(total / 12), mesIndex0: ((total % 12) + 12) % 12 };
}

function hrefMes({ ano, mesIndex0 }: { ano: number; mesIndex0: number }): string {
  return `/admin?mes=${ano}-${String(mesIndex0 + 1).padStart(2, "0")}`;
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

  // --- Calendario: ocorrencias de webinarios "agendado" no mes visivel ---
  const { ano, mesIndex0 } = resolveMes(params.mes);
  const primeiroDiaMes = primeiroDiaDoMesBrasilia(ano, mesIndex0);
  const ultimoDiaMes = ultimoDiaDoMesBrasilia(ano, mesIndex0);

  // A grade mostra semanas cheias: preenche com dias do mes anterior/seguinte
  const pesoInicio = diaDaSemanaBrasilia(primeiroDiaMes);
  const gridStart = new Date(primeiroDiaMes.getTime() - pesoInicio * DIA_MS);
  const pesoFim = diaDaSemanaBrasilia(ultimoDiaMes);
  const gridEndDayStart = new Date(ultimoDiaMes.getTime() + (6 - pesoFim) * DIA_MS);
  const gridEndInstant = new Date(gridEndDayStart.getTime() + DIA_MS - 1);
  const totalCelulas = Math.round((gridEndDayStart.getTime() - gridStart.getTime()) / DIA_MS) + 1;

  const [webinariosAgendados, sempreAtivos] = await Promise.all([
    prisma.webinar.findMany({
      where: { tipoAgendamento: "agendado", ativo: true, agendadoDataHoraInicio: { not: null } },
      select: {
        id: true,
        titulo: true,
        agendadoDataHoraInicio: true,
        agendadoDataHoraFim: true,
        agendadoRepeticao: true,
        agendadoPausado: true,
      },
    }),
    prisma.webinar.findMany({
      where: { ativo: true, tipoAgendamento: { in: ["fixo", "recorrente"] } },
      select: {
        id: true,
        titulo: true,
        tipoAgendamento: true,
        intervaloRecorrenciaMinutos: true,
        horariosFixos: true,
        agendadoDataHoraInicio: true,
        agendadoRepeticao: true,
        delayJustInTimeMinutos: true,
      },
      orderBy: { titulo: "asc" },
    }),
  ]);

  const eventosPorDia = new Map<string, EventoCalendario[]>();
  for (const webinar of webinariosAgendados) {
    if (!webinar.agendadoDataHoraInicio) continue;
    const ocorrencias = getOcorrenciasAgendadoNoIntervalo(
      webinar.agendadoDataHoraInicio,
      (webinar.agendadoRepeticao as RepeticaoAgendado) ?? "nenhuma",
      webinar.agendadoDataHoraFim,
      webinar.agendadoPausado,
      gridStart,
      gridEndInstant,
    );
    for (const ocorrencia of ocorrencias) {
      const chave = chaveDiaBrasilia(ocorrencia);
      const horario = toDatetimeLocalBrasilia(ocorrencia).slice(11, 16);
      const lista = eventosPorDia.get(chave) ?? [];
      lista.push({ webinarId: webinar.id, titulo: webinar.titulo, horario });
      eventosPorDia.set(chave, lista);
    }
  }
  for (const lista of eventosPorDia.values()) lista.sort((a, b) => a.horario.localeCompare(b.horario));

  const chaveMesAtual = `${ano}-${String(mesIndex0 + 1).padStart(2, "0")}`;
  const chaveHoje = chaveDiaBrasilia(new Date());
  const celulas: CelulaCalendario[] = [];
  for (let i = 0; i < totalCelulas; i++) {
    const data = new Date(gridStart.getTime() + i * DIA_MS);
    const chave = chaveDiaBrasilia(data);
    celulas.push({
      chave,
      dia: Number(chave.slice(8, 10)),
      noMesAtual: chave.slice(0, 7) === chaveMesAtual,
      hoje: chave === chaveHoje,
      eventos: eventosPorDia.get(chave) ?? [],
    });
  }

  const tituloMesBruto = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: FUSO_BRASILIA,
  }).format(primeiroDiaMes);
  const tituloMes = tituloMesBruto.charAt(0).toUpperCase() + tituloMesBruto.slice(1);

  // --- Retencao real (YouTube Analytics) do webinario escolhido no seletor ---
  const webinariosComVideo = await prisma.webinar.findMany({
    where: { ativo: true, videoUrl: { not: null } },
    select: { id: true, titulo: true, videoUrl: true },
    orderBy: { criadoEm: "desc" },
  });
  const webinarRetencao =
    webinariosComVideo.find((webinar) => webinar.id === params.video) ?? webinariosComVideo[0] ?? null;
  const videoIdRetencao = webinarRetencao?.videoUrl ? extractYouTubeId(webinarRetencao.videoUrl) : null;
  const resultadoRetencao = videoIdRetencao ? await buscarRetencaoVideo(videoIdRetencao) : null;

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

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <WebinarCalendarioMes
            tituloMes={tituloMes}
            celulas={celulas}
            hrefMesAnterior={hrefMes(mesAdjacente(ano, mesIndex0, -1))}
            hrefProximoMes={hrefMes(mesAdjacente(ano, mesIndex0, 1))}
            hrefHoje="/admin"
          />

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Sempre ativos</h2>
            <p className="mb-3 text-xs text-gray-500">
              Recorrente e fixo não têm dia marcado - ficam ao vivo todos os dias.
            </p>
            {sempreAtivos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum webinário recorrente ou fixo ativo.</p>
            ) : (
              <ul className="space-y-2.5">
                {sempreAtivos.map((webinar) => (
                  <li key={webinar.id}>
                    <Link
                      href={`/admin/webinars/${webinar.id}/editar`}
                      className="block rounded-lg border border-gray-100 px-2.5 py-2 text-xs hover:border-orange-200 hover:bg-orange-50/50"
                    >
                      <p className="truncate font-medium text-gray-800">{webinar.titulo}</p>
                      <p className="mt-0.5 text-gray-500">{resumoAgenda(webinar)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {webinarRetencao && resultadoRetencao?.status === "ok" ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-800">Retenção média do webinário</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                  Dados reais do YouTube
                </span>
                {webinariosComVideo.length > 1 && (
                  <SeletorWebinarRetencao webinarios={webinariosComVideo} selecionadoId={webinarRetencao.id} />
                )}
              </div>
            </div>
            <p className="mb-4 truncate text-xs text-gray-500">{webinarRetencao.titulo}</p>
            <RetentionChartReal pontos={resultadoRetencao.pontos} />
            <div className="mt-2 flex justify-between text-[11px] text-gray-400">
              <span>Início</span>
              <span>Fim</span>
            </div>
          </div>
        ) : (
          <div>
            <RetentionChartExample />
            {webinariosComVideo.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-xs text-gray-500">
                  {resultadoRetencao?.status === "erro"
                    ? resultadoRetencao.mensagem
                    : "Conecte um canal do YouTube pra ver a retenção real aqui."}{" "}
                  <Link href="/admin/youtube" className="font-medium text-orange-600 hover:text-orange-700">
                    {resultadoRetencao?.status === "erro" ? "Ver conexão" : "Conectar YouTube"}
                  </Link>
                </p>
                {webinariosComVideo.length > 1 && webinarRetencao && (
                  <SeletorWebinarRetencao webinarios={webinariosComVideo} selecionadoId={webinarRetencao.id} />
                )}
              </div>
            )}
          </div>
        )}

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
