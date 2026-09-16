import { AdminShell } from "@/components/admin/AdminShell";
import { RemoverMembroButton } from "@/components/admin/RemoverMembroButton";
import { getSessao } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { convidarMembro, removerMembro } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-orange-500";

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(
    data,
  );
}

export default async function EquipePage() {
  const [sessao, membros] = await Promise.all([
    getSessao(),
    prisma.membro.findMany({ orderBy: { criadoEm: "asc" } }),
  ]);
  const ehAdminPrincipal = sessao?.tipo === "admin";

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="mb-1 text-xl font-semibold">Equipe</h1>
        <p className="mb-4 text-sm text-gray-500">
          Membros têm acesso a todas as funções do painel. Só a conta admin principal pode adicionar ou remover
          membros.
        </p>

        <div className="space-y-6 pb-16">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Membros ({membros.length + 1})</h2>

            <ul className="divide-y divide-gray-100">
              <li className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">Admin principal</p>
                  <p className="text-xs text-gray-500">Acesso total, incluindo gerenciar a equipe.</p>
                </div>
                {sessao?.tipo === "admin" && (
                  <span className="shrink-0 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-700">
                    Você
                  </span>
                )}
              </li>

              {membros.map((membro) => (
                <li key={membro.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{membro.email}</p>
                    <p className="text-xs text-gray-500">Membro desde {formatarData(membro.criadoEm)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {sessao?.tipo === "membro" && sessao.membro.id === membro.id && (
                      <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-700">
                        Você
                      </span>
                    )}
                    {ehAdminPrincipal && (
                      <RemoverMembroButton email={membro.email} action={removerMembro.bind(null, membro.id)} />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {membros.length === 0 && <p className="py-2 text-sm text-gray-500">Nenhum membro adicionado ainda.</p>}
          </div>

          {ehAdminPrincipal ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Adicionar membro</h2>
              <p className="mb-4 text-xs text-gray-500">
                Defina o email e uma senha pra esse membro - combine com ele como vai receber esses dados (WhatsApp,
                por exemplo). Ele já consegue entrar com email e senha na tela de login.
              </p>
              <form action={convidarMembro} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-500" htmlFor="email">
                    Email
                  </label>
                  <input id="email" name="email" type="email" required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-500" htmlFor="senha">
                    Senha
                  </label>
                  <input
                    id="senha"
                    name="senha"
                    type="text"
                    required
                    minLength={6}
                    placeholder="Pelo menos 6 caracteres"
                    className={inputClass}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
                  >
                    Adicionar membro
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
              Só a conta admin principal pode adicionar ou remover membros da equipe.
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
