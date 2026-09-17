import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatarDataHoraBrasilia } from "@/lib/scheduling";
import { getConexaoAtiva, youtubeIntegracaoDisponivel } from "@/lib/youtubeAnalytics";
import { desconectarYoutubeAction } from "./actions";

export const dynamic = "force-dynamic";

type YoutubePageProps = {
  searchParams: Promise<{ erro?: string; conectado?: string }>;
};

export default async function YoutubePage({ searchParams }: YoutubePageProps) {
  const { erro, conectado } = await searchParams;
  const disponivel = youtubeIntegracaoDisponivel();
  const conexao = await getConexaoAtiva();

  return (
    <AdminShell>
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <h1 className="mb-1 text-xl font-semibold">Integração com o YouTube</h1>
        <p className="mb-6 text-sm text-gray-500">
          Conecta um canal do YouTube pra puxar a retenção real dos vídeos no dashboard, em vez do gráfico de
          exemplo. Vale pra qualquer webinário cujo vídeo seja desse canal.
        </p>

        {erro && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-700">
            {erro}
          </div>
        )}
        {conectado && (
          <div className="mb-4 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-2.5 text-sm text-orange-700">
            Canal conectado com sucesso.
          </div>
        )}

        {!disponivel && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-800">
            Faltam as credenciais OAuth (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET) nas variáveis de ambiente.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {conexao ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  Conectado como {conexao.canalNome ?? conexao.canalId ?? "canal do YouTube"}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">Desde {formatarDataHoraBrasilia(conexao.conectadoEm)}</p>
              </div>
              <form action={desconectarYoutubeAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Desconectar
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Nenhum canal conectado ainda.</p>
              {disponivel && (
                <Link
                  href="/admin/youtube/conectar"
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
                >
                  Conectar YouTube
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Depois de conectar, escolha o webinário no{" "}
            <Link href="/admin" className="font-medium text-orange-600 hover:text-orange-700">
              dashboard
            </Link>{" "}
            pra ver a retenção real do vídeo.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
