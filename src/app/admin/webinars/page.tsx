import Image from "next/image";
import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, Copy, Globe, Link2, MonitorPlay, Pencil, Plus, Video } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { webinarPath } from "@/lib/linksAcesso";
import { TIPOS_AGENDAMENTO } from "@/lib/scheduling";
import { resumoAgenda, rotuloTipoAgendamento } from "@/lib/webinarResumo";
import { extractYouTubeId } from "@/lib/youtube";
import { BotaoIcone, classeBotaoIcone } from "@/components/admin/BotaoIcone";
import { FiltrosWebinars } from "@/components/admin/FiltrosWebinars";
import { ImportarWebinarDialog } from "@/components/admin/ImportarWebinarDialog";
import { WebinarAcoesMenu } from "@/components/admin/WebinarAcoesMenu";
import { deleteWebinar, duplicateWebinar } from "./actions";

export const dynamic = "force-dynamic";

const POR_PAGINA = 10;
const COLUNAS = "lg:grid-cols-[minmax(0,1fr)_96px_116px_84px_252px]";

type WebinarsListPageProps = {
  searchParams: Promise<{ q?: string; status?: string; tipo?: string; ordem?: string; pagina?: string }>;
};

export default async function WebinarsListPage({ searchParams }: WebinarsListPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status === "ativo" || params.status === "inativo" ? params.status : "";
  const tipo = params.tipo && (TIPOS_AGENDAMENTO as readonly string[]).includes(params.tipo) ? params.tipo : "";
  const ordem = params.ordem === "antigos" || params.ordem === "nome" ? params.ordem : "recentes";

  const where: Prisma.WebinarWhereInput = {
    ...(q
      ? {
          OR: [
            { titulo: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { ativo: status === "ativo" } : {}),
    ...(tipo ? { tipoAgendamento: tipo } : {}),
  };
  const orderBy: Prisma.WebinarOrderByWithRelationInput =
    ordem === "antigos" ? { criadoEm: "asc" } : ordem === "nome" ? { titulo: "asc" } : { criadoEm: "desc" };

  const total = await prisma.webinar.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1), totalPaginas);
  const webinars = await prisma.webinar.findMany({
    where,
    orderBy,
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
    include: { _count: { select: { leads: true } } },
  });

  function hrefPagina(numero: number): string {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    if (tipo) query.set("tipo", tipo);
    if (ordem !== "recentes") query.set("ordem", ordem);
    if (numero > 1) query.set("pagina", String(numero));
    const queryString = query.toString();
    return queryString ? `/admin/webinars?${queryString}` : "/admin/webinars";
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[28px]">Webinários</h1>
          <p className="mt-1 text-sm text-gray-500">Crie, organize e acompanhe suas salas automatizadas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportarWebinarDialog />
          <Link
            href="/admin/webinars/novo"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            Criar novo
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <FiltrosWebinars q={q} status={status} tipo={tipo} ordem={ordem} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div
          className={`hidden gap-4 border-b border-gray-200 px-5 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 lg:grid ${COLUNAS}`}
        >
          <span>Nome / Agenda</span>
          <span>Status</span>
          <span>Tipo</span>
          <span>Cadastros</span>
          <span className="text-right">Ações</span>
        </div>

        {webinars.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <MonitorPlay className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-medium text-gray-900">
              {q || status || tipo ? "Nenhum webinário encontrado" : "Nenhum webinário criado ainda"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {q || status || tipo ? "Ajuste a busca ou os filtros." : "Crie o primeiro ou importe um JSON exportado."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {webinars.map((webinar) => {
              const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
              const editarHref = `/admin/webinars/${webinar.id}/editar`;
              return (
                <li
                  key={webinar.id}
                  className={`grid gap-3 px-5 py-4 transition hover:bg-gray-50/70 lg:items-center lg:gap-4 ${COLUNAS}`}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <Miniatura videoId={videoId} />
                    <div className="min-w-0" title={webinarPath(webinar.slug)}>
                      <Link
                        href={editarHref}
                        className="line-clamp-2 text-[15px] font-medium leading-snug text-gray-900 hover:text-emerald-700"
                      >
                        {webinar.titulo}
                      </Link>
                      <p className="mt-1 truncate text-[13px] text-gray-500">{resumoAgenda(webinar)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:contents">
                    <div>
                      <StatusBadge ativo={webinar.ativo} />
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {rotuloTipoAgendamento(webinar.tipoAgendamento)}
                      </span>
                    </div>
                    <div className="text-sm tabular-nums text-gray-700">
                      <span className="text-gray-400 lg:hidden">Cadastros: </span>
                      {webinar._count.leads}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 lg:justify-end">
                    <BotaoIcone href={`/admin/webinars/${webinar.id}/links`} rotulo="Links" icone={Link2} />
                    <BotaoIcone href={editarHref} rotulo="Editar" icone={Pencil} />
                    <BotaoIcone href={`/admin/funil?webinarId=${webinar.id}`} rotulo="Métricas" icone={BarChart3} />
                    <BotaoIcone href={webinarPath(webinar.slug)} rotulo="Abrir sala" icone={Globe} externo />
                    <form action={duplicateWebinar.bind(null, webinar.id)}>
                      <button type="submit" title="Duplicar" aria-label="Duplicar" className={classeBotaoIcone}>
                        <Copy className="h-4 w-4" />
                      </button>
                    </form>
                    <WebinarAcoesMenu
                      webinarId={webinar.id}
                      titulo={webinar.titulo}
                      totalCadastros={webinar._count.leads}
                      duplicarAction={duplicateWebinar.bind(null, webinar.id)}
                      excluirAction={deleteWebinar.bind(null, webinar.id)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-3 text-sm text-gray-500">
          <span>
            Total de registros: <span className="font-medium text-gray-700">{total}</span>
          </span>
          <div className="flex items-center gap-3">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex gap-1.5">
              <LinkPagina href={pagina > 1 ? hrefPagina(pagina - 1) : null} rotulo="Anterior" icone="anterior" />
              <LinkPagina
                href={pagina < totalPaginas ? hrefPagina(pagina + 1) : null}
                rotulo="Próximo"
                icone="proximo"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Miniatura({ videoId }: { videoId: string | null }) {
  return (
    <div className="relative hidden h-12 w-[84px] shrink-0 overflow-hidden rounded-md bg-gray-100 sm:block">
      {videoId ? (
        <Image src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" fill sizes="84px" className="object-cover" />
      ) : (
        <Video className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
      )}
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ativo ? "bg-emerald-500" : "bg-gray-400"}`} />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function LinkPagina({ href, rotulo, icone }: { href: string | null; rotulo: string; icone: "anterior" | "proximo" }) {
  const conteudo = (
    <>
      {icone === "anterior" && <ChevronLeft className="h-4 w-4" />}
      {rotulo}
      {icone === "proximo" && <ChevronRight className="h-4 w-4" />}
    </>
  );
  const classe = "inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition";
  if (!href) {
    return (
      <span aria-disabled="true" className={`${classe} cursor-not-allowed border-gray-100 text-gray-300`}>
        {conteudo}
      </span>
    );
  }
  return (
    <Link href={href} className={`${classe} border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
      {conteudo}
    </Link>
  );
}
