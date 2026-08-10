"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type ChatScriptItem = {
  timestampSegundos: number;
  nomeAutor: string;
  texto: string;
  tipo: string;
};

export async function saveChatScript(webinarId: string, formData: FormData) {
  const raw = String(formData.get("mensagens") ?? "[]");

  let items: ChatScriptItem[];
  try {
    items = JSON.parse(raw);
  } catch {
    throw new Error("Roteiro invalido.");
  }

  // Substituicao total: mais simples e menos propenso a erro do que
  // sincronizar create/update/delete individualmente por linha, e o roteiro
  // inteiro sempre cabe numa unica edicao no admin.
  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { webinarId } }),
    prisma.chatMessage.createMany({
      data: items
        .filter((item) => String(item.texto ?? "").trim().length > 0)
        .map((item, index) => ({
          webinarId,
          timestampSegundos: Math.max(0, Math.floor(Number(item.timestampSegundos) || 0)),
          nomeAutor: String(item.nomeAutor ?? "").trim() || "Anonimo",
          texto: String(item.texto ?? "").trim(),
          tipo: item.tipo === "sistema" ? "sistema" : "mensagem",
          ordem: index,
        })),
    }),
  ]);

  revalidatePath(`/admin/webinars/${webinarId}/chat`);
}
