"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseDatetimeLocalBrasilia } from "@/lib/scheduling";

function lerInteiro(formData: FormData, nome: string, minimo: number): number | null {
  const raw = String(formData.get(nome) ?? "").trim();
  if (!raw) return null;
  const valor = Number(raw);
  if (!Number.isInteger(valor) || valor < minimo) throw new Error("Número inválido nas configurações de links.");
  return valor;
}

function lerDataHora(formData: FormData, nome: string): Date | null {
  const raw = String(formData.get(nome) ?? "").trim();
  if (!raw) return null;
  const data = parseDatetimeLocalBrasilia(raw);
  if (!data) throw new Error("Data inválida nas configurações de links.");
  return data;
}

export async function salvarConfigLinks(id: string, formData: FormData) {
  const replayLiberarEm = lerDataHora(formData, "replayLiberarEm");
  const replayExpirarEm = lerDataHora(formData, "replayExpirarEm");
  if (replayLiberarEm && replayExpirarEm && replayExpirarEm.getTime() <= replayLiberarEm.getTime()) {
    throw new Error("A expiração do replay precisa ser depois da data de liberação.");
  }

  await prisma.webinar.update({
    where: { id },
    data: {
      exigirCadastro: formData.get("exigirCadastro") === "on",
      justInTimeAtivo: formData.get("justInTimeAtivo") === "on",
      delayJustInTimeMinutos: lerInteiro(formData, "delayJustInTimeMinutos", 0),
      replayAtivo: formData.get("replayAtivo") === "on",
      replayLiberarEm,
      replayExpirarEm,
      replayDuracaoHoras: lerInteiro(formData, "replayDuracaoHoras", 1),
    },
  });

  revalidatePath(`/admin/webinars/${id}/links`);
  redirect(`/admin/webinars/${id}/links?salvo=1`);
}

/** Troca o token da sala teste - o link anterior para de funcionar. */
export async function regenerarTokenSalaTeste(id: string) {
  await prisma.webinar.update({ where: { id }, data: { tokenSalaTeste: randomUUID() } });
  revalidatePath(`/admin/webinars/${id}/links`);
  redirect(`/admin/webinars/${id}/links`);
}
