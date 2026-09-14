"use server";

import { exigirAdmin } from "@/lib/adminAuth";
import { responderComoSuporte, type ResultadoResposta } from "@/lib/aoVivo";

/** Resposta do suporte pelo painel Ao vivo. */
export async function responderComentario(comentarioId: string, texto: string): Promise<ResultadoResposta> {
  await exigirAdmin();
  return responderComoSuporte(comentarioId, texto);
}
