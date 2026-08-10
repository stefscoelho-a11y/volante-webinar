"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function signUpJustInTime(webinarId: string, slug: string, delayMinutos: number, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!nome || !email) {
    throw new Error("Preencha nome e email.");
  }

  const entrouEm = new Date();
  const sessaoEscolhida = new Date(entrouEm.getTime() + delayMinutos * 60_000);

  await prisma.lead.create({
    data: { webinarId, nome, email, entrouEm, sessaoEscolhida },
  });

  redirect(`/w/${slug}/sala?sessionStart=${encodeURIComponent(sessaoEscolhida.toISOString())}`);
}
