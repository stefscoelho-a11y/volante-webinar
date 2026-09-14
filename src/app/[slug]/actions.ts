"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lerDadosParticipante } from "@/lib/linksAcesso";
import { registrarEntrada, salvarCookieLead } from "@/lib/leads";

/**
 * Formulario de cadastro das paginas de entrada (sala principal, just in
 * time e replay). O webinar e relido do banco: delay e horarios nunca vem do
 * navegador.
 */
export async function cadastrar(slug: string, via: string, formData: FormData) {
  const webinar = await prisma.webinar.findUnique({ where: { slug } });
  if (!webinar || !webinar.ativo) throw new Error("Webinário não encontrado.");

  const campos: Record<string, string> = {};
  formData.forEach((valor, chave) => {
    if (typeof valor === "string") campos[chave] = valor;
  });
  const dados = lerDadosParticipante(campos);
  if (!dados) throw new Error("Preencha nome e um email válido.");

  const { lead, destino } = await registrarEntrada(webinar, dados, via, false);
  await salvarCookieLead(lead);
  redirect(destino);
}
