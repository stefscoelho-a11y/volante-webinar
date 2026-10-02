import { prisma } from "@/lib/prisma";

export const TIPOS_EVENTO_FUNIL = ["entrou_sala", "chegou_pitch", "clicou_cta"] as const;
export type TipoEventoFunil = (typeof TIPOS_EVENTO_FUNIL)[number];

/**
 * Marca que um visitante passou por uma etapa do funil, pela primeira vez
 * nessa sessao. skipDuplicates faz o "pela primeira vez": chamadas repetidas
 * (ping de presenca a cada poucos segundos, por exemplo) nao duplicam linha.
 */
export async function registrarEventoFunil(dados: {
  webinarId: string;
  visitanteId: string;
  tipo: TipoEventoFunil;
  sessao: string;
  leadId?: string | null;
}): Promise<void> {
  await prisma.eventoFunil.createMany({
    data: [
      {
        webinarId: dados.webinarId,
        visitanteId: dados.visitanteId,
        tipo: dados.tipo,
        sessao: dados.sessao,
        leadId: dados.leadId ?? null,
      },
    ],
    skipDuplicates: true,
  });
}
