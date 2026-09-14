"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lerSegmentos } from "@/lib/legendas";
import { Prisma } from "@/generated/prisma/client";
import { REPETICOES_AGENDADO, TIPOS_AGENDAMENTO, type RepeticaoAgendado, type TipoAgendamento } from "@/lib/scheduling";
import { parseFonteSala, parseHexColor, parseTemaSala, VISUAL_DEFAULTS } from "@/lib/webinarVisual";
import { SLUGS_RESERVADOS } from "@/lib/linksAcesso";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseWebinarFormData(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || titulo);
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const videoDurationSeconds = Number(formData.get("videoDurationSeconds"));
  const pitchTimestampSeconds = Number(formData.get("pitchTimestampSeconds"));
  const ctaTexto = String(formData.get("ctaTexto") ?? "").trim();
  const ctaLink = String(formData.get("ctaLink") ?? "").trim();
  const tipoAgendamentoRaw = String(formData.get("tipoAgendamento") ?? "recorrente");
  const tipoAgendamento: TipoAgendamento = (TIPOS_AGENDAMENTO as readonly string[]).includes(tipoAgendamentoRaw)
    ? (tipoAgendamentoRaw as TipoAgendamento)
    : "recorrente";
  const ativo = formData.get("ativo") === "on";
  const sincronizarVideoComHorario = formData.get("sincronizarVideoComHorario") === "on";

  const horariosFixosRaw = String(formData.get("horariosFixos") ?? "").trim();
  const horariosFixos =
    tipoAgendamento === "fixo" && horariosFixosRaw
      ? horariosFixosRaw
          .split(",")
          .map((horario) => horario.trim())
          .filter(Boolean)
      : undefined;

  const intervaloRaw = formData.get("intervaloRecorrenciaMinutos");
  const intervaloRecorrenciaMinutos =
    tipoAgendamento === "recorrente" && intervaloRaw ? Number(intervaloRaw) : undefined;

  const delayRaw = formData.get("delayJustInTimeMinutos");
  const delayJustInTimeMinutos =
    tipoAgendamento === "just_in_time" && delayRaw ? Number(delayRaw) : undefined;

  const agendadoRepeticaoRaw = String(formData.get("agendadoRepeticao") ?? "nenhuma");
  const agendadoRepeticao: RepeticaoAgendado = (REPETICOES_AGENDADO as readonly string[]).includes(
    agendadoRepeticaoRaw,
  )
    ? (agendadoRepeticaoRaw as RepeticaoAgendado)
    : "nenhuma";

  const agendadoInicioRaw = String(formData.get("agendadoDataHoraInicio") ?? "").trim();
  const agendadoDataHoraInicio =
    tipoAgendamento === "agendado" && agendadoInicioRaw ? new Date(agendadoInicioRaw) : undefined;

  const agendadoFimRaw = String(formData.get("agendadoDataHoraFim") ?? "").trim();
  const agendadoDataHoraFim =
    tipoAgendamento === "agendado" && agendadoRepeticao !== "nenhuma" && agendadoFimRaw
      ? new Date(agendadoFimRaw)
      : undefined;

  const ofertaNome = String(formData.get("ofertaNome") ?? "").trim() || undefined;
  const ofertaTitulo = String(formData.get("ofertaTitulo") ?? "").trim() || undefined;
  const ofertaImagemUrl = String(formData.get("ofertaImagemUrl") ?? "").trim() || undefined;
  const ofertaDescricao = String(formData.get("ofertaDescricao") ?? "").trim() || undefined;
  const metaPixelId = String(formData.get("metaPixelId") ?? "").trim() || undefined;

  const precoOriginalRaw = String(formData.get("precoOriginal") ?? "").trim();
  const precoOriginal = precoOriginalRaw ? Number(precoOriginalRaw) : undefined;

  const precoOfertaRaw = String(formData.get("precoOferta") ?? "").trim();
  const precoOferta = precoOfertaRaw ? Number(precoOfertaRaw) : undefined;

  const ctaCountdownRaw = String(formData.get("ctaCountdownMinutos") ?? "").trim();
  const ctaCountdownMinutos = ctaCountdownRaw ? Number(ctaCountdownRaw) : undefined;

  const ctaDesaparecerRaw = String(formData.get("ctaDesaparecerSegundos") ?? "").trim();
  const ctaDesaparecerSegundos = ctaDesaparecerRaw ? Number(ctaDesaparecerRaw) : undefined;

  const audienciaFakeMinRaw = String(formData.get("audienciaFakeMin") ?? "").trim();
  const audienciaFakeMin = audienciaFakeMinRaw ? Number(audienciaFakeMinRaw) : undefined;

  const audienciaFakeMaxRaw = String(formData.get("audienciaFakeMax") ?? "").trim();
  const audienciaFakeMax = audienciaFakeMaxRaw ? Number(audienciaFakeMaxRaw) : undefined;
  const temaSala = parseTemaSala(formData.get("temaSala"));
  const corPrimaria = parseHexColor(formData.get("corPrimaria"), VISUAL_DEFAULTS.corPrimaria);
  const corFundo = parseHexColor(formData.get("corFundo"), VISUAL_DEFAULTS.corFundo);
  const corTexto = parseHexColor(formData.get("corTexto"), VISUAL_DEFAULTS.corTexto);
  const fonteSala = parseFonteSala(formData.get("fonteSala"));

  if (!titulo || !slug || !videoUrl || !ctaTexto || !ctaLink) {
    throw new Error("Preencha todos os campos obrigatorios.");
  }
  if (SLUGS_RESERVADOS.includes(slug)) {
    throw new Error(`A URL amigavel "${slug}" e reservada pelo sistema. Escolha outra.`);
  }
  if (!Number.isFinite(videoDurationSeconds) || videoDurationSeconds <= 0) {
    throw new Error("Duracao do video invalida.");
  }
  if (!Number.isFinite(pitchTimestampSeconds) || pitchTimestampSeconds < 0) {
    throw new Error("Timestamp do CTA invalido.");
  }
  if (tipoAgendamento === "agendado" && !agendadoDataHoraInicio) {
    throw new Error("Defina a data e hora de inicio do agendamento.");
  }
  if (tipoAgendamento === "agendado" && agendadoRepeticao !== "nenhuma" && !agendadoDataHoraFim) {
    throw new Error("Defina a data e hora de finalizacao da repeticao.");
  }

  return {
    titulo,
    slug,
    videoUrl,
    videoDurationSeconds,
    pitchTimestampSeconds,
    ctaTexto,
    ctaLink,
    ctaDesaparecerSegundos,
    tipoAgendamento,
    sincronizarVideoComHorario,
    ativo,
    horariosFixos,
    intervaloRecorrenciaMinutos,
    delayJustInTimeMinutos,
    agendadoDataHoraInicio,
    agendadoDataHoraFim,
    agendadoRepeticao,
    ofertaNome,
    ofertaTitulo,
    ofertaImagemUrl,
    ofertaDescricao,
    precoOriginal,
    precoOferta,
    ctaCountdownMinutos,
    metaPixelId,
    audienciaFakeMin,
    audienciaFakeMax,
    temaSala,
    corPrimaria,
    corFundo,
    corTexto,
    fonteSala,
  };
}

export async function createWebinar(formData: FormData) {
  const data = parseWebinarFormData(formData);

  await prisma.webinar.create({
    data: {
      titulo: data.titulo,
      slug: data.slug,
      videoUrl: data.videoUrl,
      videoDurationSeconds: data.videoDurationSeconds,
      pitchTimestampSeconds: data.pitchTimestampSeconds,
      ctaTexto: data.ctaTexto,
      ctaLink: data.ctaLink,
      ctaDesaparecerSegundos: data.ctaDesaparecerSegundos,
      tipoAgendamento: data.tipoAgendamento,
      sincronizarVideoComHorario: data.sincronizarVideoComHorario,
      ativo: data.ativo,
      horariosFixos: data.horariosFixos,
      intervaloRecorrenciaMinutos: data.intervaloRecorrenciaMinutos,
      delayJustInTimeMinutos: data.delayJustInTimeMinutos,
      agendadoDataHoraInicio: data.agendadoDataHoraInicio,
      agendadoDataHoraFim: data.agendadoDataHoraFim,
      agendadoRepeticao: data.tipoAgendamento === "agendado" ? data.agendadoRepeticao : undefined,
      ofertaNome: data.ofertaNome,
      ofertaTitulo: data.ofertaTitulo,
      ofertaImagemUrl: data.ofertaImagemUrl,
      ofertaDescricao: data.ofertaDescricao,
      precoOriginal: data.precoOriginal,
      precoOferta: data.precoOferta,
      ctaCountdownMinutos: data.ctaCountdownMinutos,
      metaPixelId: data.metaPixelId,
      audienciaFakeMin: data.audienciaFakeMin,
      audienciaFakeMax: data.audienciaFakeMax,
      temaSala: data.temaSala,
      corPrimaria: data.corPrimaria,
      corFundo: data.corFundo,
      corTexto: data.corTexto,
      fonteSala: data.fonteSala,
    },
  });

  revalidatePath("/admin/webinars");
  redirect("/admin/webinars");
}

export async function updateWebinar(id: string, formData: FormData) {
  const data = parseWebinarFormData(formData);

  await prisma.webinar.update({
    where: { id },
    data: {
      titulo: data.titulo,
      slug: data.slug,
      videoUrl: data.videoUrl,
      videoDurationSeconds: data.videoDurationSeconds,
      pitchTimestampSeconds: data.pitchTimestampSeconds,
      ctaTexto: data.ctaTexto,
      ctaLink: data.ctaLink,
      ctaDesaparecerSegundos: data.ctaDesaparecerSegundos ?? null,
      tipoAgendamento: data.tipoAgendamento,
      sincronizarVideoComHorario: data.sincronizarVideoComHorario,
      ativo: data.ativo,
      horariosFixos: data.horariosFixos ?? Prisma.JsonNull,
      intervaloRecorrenciaMinutos: data.intervaloRecorrenciaMinutos ?? null,
      // Sem "?? null": o delay tambem alimenta o link just in time de webinars
      // de outros tipos (etapa Links), entao so muda quando vem no formulario.
      delayJustInTimeMinutos: data.delayJustInTimeMinutos,
      agendadoDataHoraInicio: data.agendadoDataHoraInicio ?? null,
      agendadoDataHoraFim: data.agendadoDataHoraFim ?? null,
      agendadoRepeticao: data.tipoAgendamento === "agendado" ? data.agendadoRepeticao : null,
      ofertaNome: data.ofertaNome ?? null,
      ofertaTitulo: data.ofertaTitulo ?? null,
      ofertaImagemUrl: data.ofertaImagemUrl ?? null,
      ofertaDescricao: data.ofertaDescricao ?? null,
      precoOriginal: data.precoOriginal ?? null,
      precoOferta: data.precoOferta ?? null,
      ctaCountdownMinutos: data.ctaCountdownMinutos ?? null,
      metaPixelId: data.metaPixelId ?? null,
      audienciaFakeMin: data.audienciaFakeMin ?? null,
      audienciaFakeMax: data.audienciaFakeMax ?? null,
      temaSala: data.temaSala,
      corPrimaria: data.corPrimaria,
      corFundo: data.corFundo,
      corTexto: data.corTexto,
      fonteSala: data.fonteSala,
    },
  });

  revalidatePath("/admin/webinars");
  redirect(`/admin/webinars/${id}/editar`);
}

async function gerarSlugUnico(base: string): Promise<string> {
  let candidato = `${base}-copia`;
  let sufixo = 2;
  // Confere se ja existe e vai incrementando (-copia, -copia-2, -copia-3...)
  // ate achar um slug livre.
  while (await prisma.webinar.findUnique({ where: { slug: candidato } })) {
    candidato = `${base}-copia-${sufixo}`;
    sufixo += 1;
  }
  return candidato;
}

export async function duplicateWebinar(id: string) {
  const original = await prisma.webinar.findUnique({
    where: { id },
    include: { chatMessages: true, transcricao: true },
  });
  if (!original) throw new Error("Webinario nao encontrado.");

  const novoSlug = await gerarSlugUnico(original.slug);

  const copia = await prisma.webinar.create({
    data: {
      titulo: `${original.titulo} (cópia)`,
      slug: novoSlug,
      videoUrl: original.videoUrl,
      videoFilePath: original.videoFilePath,
      videoDurationSeconds: original.videoDurationSeconds,
      pitchTimestampSeconds: original.pitchTimestampSeconds,
      ctaTexto: original.ctaTexto,
      ctaLink: original.ctaLink,
      ctaDesaparecerSegundos: original.ctaDesaparecerSegundos,
      ofertaNome: original.ofertaNome,
      ofertaTitulo: original.ofertaTitulo,
      ofertaImagemUrl: original.ofertaImagemUrl,
      ofertaDescricao: original.ofertaDescricao,
      precoOriginal: original.precoOriginal,
      precoOferta: original.precoOferta,
      ctaCountdownMinutos: original.ctaCountdownMinutos,
      metaPixelId: original.metaPixelId,
      sincronizarVideoComHorario: original.sincronizarVideoComHorario,
      audienciaFakeMin: original.audienciaFakeMin,
      audienciaFakeMax: original.audienciaFakeMax,
      temaSala: original.temaSala,
      corPrimaria: original.corPrimaria,
      corFundo: original.corFundo,
      corTexto: original.corTexto,
      fonteSala: original.fonteSala,
      tipoAgendamento: original.tipoAgendamento,
      horariosFixos: original.horariosFixos ?? undefined,
      intervaloRecorrenciaMinutos: original.intervaloRecorrenciaMinutos,
      delayJustInTimeMinutos: original.delayJustInTimeMinutos,
      agendadoDataHoraInicio: original.agendadoDataHoraInicio,
      agendadoDataHoraFim: original.agendadoDataHoraFim,
      agendadoRepeticao: original.agendadoRepeticao,
      exigirCadastro: original.exigirCadastro,
      justInTimeAtivo: original.justInTimeAtivo,
      replayAtivo: original.replayAtivo,
      replayLiberarEm: original.replayLiberarEm,
      replayExpirarEm: original.replayExpirarEm,
      replayDuracaoHoras: original.replayDuracaoHoras,
      // A copia comeca inativa de proposito - evita publicar uma sessao
      // agendada/recorrente duplicada sem revisar antes.
      ativo: false,
      transcricao: original.transcricao
        ? {
            create: {
              segmentos: lerSegmentos(original.transcricao.segmentos),
              formato: original.transcricao.formato,
              nomeArquivo: original.transcricao.nomeArquivo,
            },
          }
        : undefined,
      chatMessages: {
        create: original.chatMessages.map((mensagem) => ({
          timestampSegundos: mensagem.timestampSegundos,
          nomeAutor: mensagem.nomeAutor,
          avatarUrl: mensagem.avatarUrl,
          texto: mensagem.texto,
          tipo: mensagem.tipo,
          ordem: mensagem.ordem,
        })),
      },
    },
  });

  revalidatePath("/admin/webinars");
  redirect(`/admin/webinars/${copia.id}/editar`);
}
