"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseOfertaCampos } from "@/lib/ofertaForm";
import { slugificarCanal } from "@/lib/canaisOferta";

export async function salvarOferta(id: string, formData: FormData) {
  const oferta = parseOfertaCampos(formData);

  await prisma.webinar.update({ where: { id }, data: oferta });

  revalidatePath(`/admin/webinars/${id}/oferta`);
  redirect(`/admin/webinars/${id}/oferta?salvo=1`);
}

function lerTexto(formData: FormData, nome: string): string | null {
  const valor = String(formData.get(nome) ?? "").trim();
  return valor || null;
}

function lerNumero(formData: FormData, nome: string): number | null {
  const raw = String(formData.get(nome) ?? "").trim();
  if (!raw) return null;
  const valor = Number(raw);
  if (!Number.isFinite(valor)) throw new Error(`Valor inválido no campo "${nome}" do canal.`);
  return valor;
}

function lerInteiro(formData: FormData, nome: string): number | null {
  const raw = String(formData.get(nome) ?? "").trim();
  if (!raw) return null;
  const valor = Number(raw);
  if (!Number.isInteger(valor)) throw new Error(`Valor inválido no campo "${nome}" do canal.`);
  return valor;
}

function dadosOfertaDoFormulario(formData: FormData) {
  return {
    ofertaNome: lerTexto(formData, "ofertaNome"),
    ofertaTitulo: lerTexto(formData, "ofertaTitulo"),
    ofertaImagemUrl: lerTexto(formData, "ofertaImagemUrl"),
    ofertaDescricao: lerTexto(formData, "ofertaDescricao"),
    precoOriginal: lerNumero(formData, "precoOriginal"),
    precoOferta: lerNumero(formData, "precoOferta"),
    precoParcelado: lerTexto(formData, "precoParcelado"),
    ctaTexto: lerTexto(formData, "ctaTexto"),
    ctaLink: lerTexto(formData, "ctaLink"),
    ctaCountdownMinutos: lerInteiro(formData, "ctaCountdownMinutos"),
    ctaDesaparecerSegundos: lerInteiro(formData, "ctaDesaparecerSegundos"),
    metaPixelId: lerTexto(formData, "metaPixelId"),
  };
}

function lerNomeESlug(formData: FormData): { nome: string; slug: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe um nome para o canal.");

  const slugDigitado = String(formData.get("slug") ?? "").trim();
  const slug = slugificarCanal(slugDigitado || nome);
  if (!slug) throw new Error('Não foi possível gerar um identificador de URL a partir desse nome. Tente algo com letras ou números.');

  return { nome, slug };
}

export async function criarCanal(webinarId: string, formData: FormData) {
  const { nome, slug } = lerNomeESlug(formData);

  const existente = await prisma.canalOferta.findUnique({ where: { webinarId_slug: { webinarId, slug } } });
  if (existente) throw new Error(`Já existe um canal com o identificador "${slug}" neste webinário.`);

  await prisma.canalOferta.create({ data: { webinarId, nome, slug, ...dadosOfertaDoFormulario(formData) } });

  revalidatePath(`/admin/webinars/${webinarId}/oferta`);
  redirect(`/admin/webinars/${webinarId}/oferta`);
}

export async function atualizarCanal(webinarId: string, canalId: string, formData: FormData) {
  const { nome, slug } = lerNomeESlug(formData);

  const conflito = await prisma.canalOferta.findFirst({ where: { webinarId, slug, NOT: { id: canalId } } });
  if (conflito) throw new Error(`Já existe um canal com o identificador "${slug}" neste webinário.`);

  await prisma.canalOferta.update({
    where: { id: canalId },
    data: { nome, slug, ...dadosOfertaDoFormulario(formData) },
  });

  revalidatePath(`/admin/webinars/${webinarId}/oferta`);
  redirect(`/admin/webinars/${webinarId}/oferta`);
}

export async function excluirCanal(webinarId: string, canalId: string) {
  await prisma.canalOferta.delete({ where: { id: canalId } });
  revalidatePath(`/admin/webinars/${webinarId}/oferta`);
  redirect(`/admin/webinars/${webinarId}/oferta`);
}
