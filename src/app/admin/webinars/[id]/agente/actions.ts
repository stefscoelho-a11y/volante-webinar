"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function lerTexto(formData: FormData, nome: string): string | null {
  const valor = String(formData.get(nome) ?? "").trim();
  return valor || null;
}

export async function salvarAgente(id: string, formData: FormData) {
  const agenteIaAtivo = formData.get("agenteIaAtivo") === "on";

  await prisma.webinar.update({
    where: { id },
    data: {
      agenteIaAtivo,
      agenteNome: lerTexto(formData, "agenteNome"),
      agenteFotoUrl: lerTexto(formData, "agenteFotoUrl"),
      agenteInformacoesProduto: lerTexto(formData, "agenteInformacoesProduto"),
      agenteTom: lerTexto(formData, "agenteTom"),
      agenteRoteiroAula: lerTexto(formData, "agenteRoteiroAula"),
    },
  });

  revalidatePath(`/admin/webinars/${id}/agente`);
  redirect(`/admin/webinars/${id}/agente?salvo=1`);
}
