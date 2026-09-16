"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { exigirAdminPrincipal } from "@/lib/adminAuth";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cria o login do membro direto (email + senha definidos pelo admin) - so a conta admin principal pode chamar isso. */
export async function convidarMembro(formData: FormData) {
  await exigirAdminPrincipal();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!EMAIL_VALIDO.test(email)) throw new Error("Informe um email válido.");
  if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");

  const existente = await prisma.membro.findUnique({ where: { email } });
  if (existente) throw new Error("Já existe um membro com esse email.");

  await prisma.membro.create({ data: { email, senhaHash: hashSenha(senha) } });

  revalidatePath("/admin/equipe");
  redirect("/admin/equipe");
}

/** Remove o membro - a sessao dele (se estiver logado) para de valer na proxima requisicao. */
export async function removerMembro(membroId: string) {
  await exigirAdminPrincipal();
  await prisma.membro.deleteMany({ where: { id: membroId } });
  revalidatePath("/admin/equipe");
  redirect("/admin/equipe");
}
