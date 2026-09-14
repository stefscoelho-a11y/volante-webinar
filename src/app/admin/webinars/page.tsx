import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { webinarPath } from "@/lib/linksAcesso";
import { duplicateWebinar } from "./actions";

export const dynamic = "force-dynamic";

export default async function WebinarsListPage() {
  const webinars = await prisma.webinar.findMany({ orderBy: { criadoEm: "desc" } });

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Webinarios</h1>
        <Link
          href="/admin/webinars/novo"
          className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
        >
          + Novo webinario
        </Link>
      </div>

      {webinars.length === 0 && <p className="text-gray-500">Nenhum webinario criado ainda.</p>}

      <div className="space-y-2">
        {webinars.map((webinar) => (
          <div
            key={webinar.id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{webinar.titulo}</p>
              <p className="text-sm text-gray-500">
                {webinarPath(webinar.slug)} · {webinar.tipoAgendamento} · {webinar.ativo ? "ativo" : "inativo"}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <Link href={`/admin/webinars/${webinar.id}/chat`} className="text-gray-500 hover:text-gray-800">
                Roteiro de chat
              </Link>
              <Link href={`/admin/webinars/${webinar.id}/preview`} className="text-gray-500 hover:text-gray-800">
                Preview
              </Link>
              <Link href={`/admin/webinars/${webinar.id}/links`} className="text-gray-500 hover:text-gray-800">
                Links
              </Link>
              <Link href={webinarPath(webinar.slug)} target="_blank" className="text-gray-500 hover:text-gray-800">
                Ver sala
              </Link>
              <Link href={`/admin/webinars/${webinar.id}/editar`} className="text-emerald-600 hover:text-emerald-700">
                Editar
              </Link>
              <form action={duplicateWebinar.bind(null, webinar.id)}>
                <button type="submit" className="text-gray-500 hover:text-gray-800">
                  Duplicar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
