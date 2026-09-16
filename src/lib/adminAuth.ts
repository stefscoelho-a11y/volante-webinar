import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Membro } from "@/generated/prisma/client";

/**
 * Sessao do painel admin: a conta admin principal (senha em ADMIN_PASSWORD)
 * ou um membro da equipe (login proprio, email + senha). O cookie guarda
 * "admin:<senha>" ou "membro:<sessionToken>" - o proxy (src/proxy.ts) faz a
 * mesma checagem pra proteger as rotas /admin/*.
 *
 * A constante do nome do cookie mora aqui (nao em src/proxy.ts) pra evitar
 * import circular: o proxy importa lerSessao() daqui.
 */

export const ADMIN_COOKIE_NAME = "admin_auth";

export type Sessao = { tipo: "admin" } | { tipo: "membro"; membro: Membro };

const PREFIXO_ADMIN = "admin:";
const PREFIXO_MEMBRO = "membro:";

export function cookieDeAdmin(): string {
  return `${PREFIXO_ADMIN}${process.env.ADMIN_PASSWORD}`;
}

export function cookieDeMembro(membro: Membro): string {
  return `${PREFIXO_MEMBRO}${membro.sessionToken}`;
}

/** Usado pelo proxy (fora de um Server Component/Action) e pelas checagens abaixo. */
export async function lerSessao(valorCookie: string | undefined): Promise<Sessao | null> {
  if (!valorCookie) return null;

  if (valorCookie.startsWith(PREFIXO_ADMIN)) {
    const senha = valorCookie.slice(PREFIXO_ADMIN.length);
    return senha && senha === process.env.ADMIN_PASSWORD ? { tipo: "admin" } : null;
  }

  if (valorCookie.startsWith(PREFIXO_MEMBRO)) {
    const token = valorCookie.slice(PREFIXO_MEMBRO.length);
    if (!token) return null;
    const membro = await prisma.membro.findUnique({ where: { sessionToken: token } });
    return membro ? { tipo: "membro", membro } : null;
  }

  return null;
}

export async function getSessao(): Promise<Sessao | null> {
  const valor = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return lerSessao(valor);
}

/**
 * Confere qualquer sessao valida (admin ou membro) dentro de server actions e
 * rotas. O proxy so protege os caminhos /admin, mas uma server action pode
 * ser chamada de qualquer caminho - entao a checagem precisa estar na
 * propria action.
 */
export async function exigirAdmin(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao) throw new Error("Não autorizado.");
  return sessao;
}

/** So a conta admin principal pode adicionar ou remover membros da equipe. */
export async function exigirAdminPrincipal(): Promise<void> {
  const sessao = await exigirAdmin();
  if (sessao.tipo !== "admin") throw new Error("Só a conta admin principal pode gerenciar a equipe.");
}
