import Link from "next/link";
import { ChevronRight, MonitorPlay } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { contarAssistindoPorWebinar } from "@/lib/aoVivo";
import { resumoAgenda } from "@/lib/webinarResumo";
import { AdminShell } from "@/components/admin/AdminShell";
import { AtualizarPagina } from "@/components/admin/AtualizarPagina";

export const dynamic = "force-dynamic";

/** Visao geral: quantas pessoas estao em cada sala agora. */
export default async function AoVivoPage() {
  const webinars = await prisma.webinar.findMany({ orderBy: [{ ativo: "desc" }, { criadoEm: "desc" }] });
  const assistindoPorWebinar = await contarAssistindoPorWebinar(webinars.map((webinar) => webinar.id));
  const totalAgora = [...assistindoPorWebinar.values()].reduce((soma, quantidade) => soma + quantidade, 0);
  // Salas com gente primeiro
  const ordenados = [...webinars].sort(
    (a, b) => (assistindoPorWebinar.get(b.id) ?? 0) - (assistindoPorWebinar.get(a.id) ?? 0),
  );

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
        <AtualizarPagina intervaloMs={10_000} />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[28px]">Ao vivo</h1>
            <p className="mt-1 text-sm text-gray-500">Quem está nas salas agora. Atualiza sozinho.</p>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <PontoAoVivo ativo={totalAgora > 0} />
            <span className="text-2xl font-semibold tabular-nums text-gray-900">{totalAgora}</span>
            <span className="text-sm text-gray-500">{totalAgora === 1 ? "pessoa assistindo" : "pessoas assistindo"}</span>
          </div>
        </div>

        {ordenados.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
            <MonitorPlay className="h-6 w-6 text-orange-600" />
            <p className="mt-3 text-sm text-gray-500">Nenhum webinário criado ainda.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ordenados.map((webinar) => {
              const assistindo = assistindoPorWebinar.get(webinar.id) ?? 0;
              return (
                <li key={webinar.id}>
                  <Link
                    href={`/admin/ao-vivo/${webinar.id}`}
                    className="group flex h-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[15px] font-medium leading-snug text-gray-900">{webinar.titulo}</p>
                      <p className="mt-1 truncate text-[13px] text-gray-500">
                        {webinar.ativo ? resumoAgenda(webinar) : "Inativo"}
                      </p>
                      <p
                        className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${
                          assistindo > 0 ? "text-orange-700" : "text-gray-400"
                        }`}
                      >
                        <PontoAoVivo ativo={assistindo > 0} />
                        {assistindo} assistindo agora
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-orange-600" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}

function PontoAoVivo({ ativo }: { ativo: boolean }) {
  if (!ativo) return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-gray-300" />;
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
    </span>
  );
}
