"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import { ADMIN_COOKIE_NAME, cookieDeAdmin, cookieDeMembro } from "@/lib/adminAuth";

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

async function salvarCookieSessao(valor: string) {
  (await cookies()).set(ADMIN_COOKIE_NAME, valor, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
  });
}

/**
 * Email em branco = login da conta admin principal (so senha, comparada com
 * ADMIN_PASSWORD). Email preenchido = login de um membro da equipe.
 */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const next = formData.get("next")?.toString() || "/admin/webinars";

  if (!email) {
    if (senha && process.env.ADMIN_PASSWORD && senha === process.env.ADMIN_PASSWORD) {
      await salvarCookieSessao(cookieDeAdmin());
      redirect(next);
    }
  } else if (senha) {
    const membro = await prisma.membro.findUnique({ where: { email } });
    if (membro && verificarSenha(senha, membro.senhaHash)) {
      await salvarCookieSessao(cookieDeMembro(membro));
      redirect(next);
    }
  }

  redirect(`/admin/login?erro=1&next=${encodeURIComponent(next)}`);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
