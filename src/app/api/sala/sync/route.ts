import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLeadAtual, participanteDoChat } from "@/lib/leads";
import { ONLINE_ATE_SEGUNDOS, type ComentarioAoVivo } from "@/lib/chatAoVivo";

export const dynamic = "force-dynamic";

const VISITANTE_VALIDO = /^[A-Za-z0-9-]{8,64}$/;
// Sem sinal ha mais que isso e voltou: conta como uma nova entrada
const REENTRADA_MS = 2 * 60 * 1000;

type CorpoSync = {
  webinarId?: unknown;
  visitanteId?: unknown;
  pagina?: unknown;
  sessao?: unknown;
  videoSegundos?: unknown;
  desde?: unknown;
  saindo?: unknown;
};

/**
 * Chamado pela sala a cada poucos segundos: registra que o visitante esta
 * assistindo (painel Ao vivo do admin) e devolve os comentarios novos dele e
 * as respostas do suporte. Polling em vez de websocket porque a Vercel nao
 * mantem conexoes abertas.
 */
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => null)) as CorpoSync | null;
  const webinarId = typeof corpo?.webinarId === "string" ? corpo.webinarId : "";
  const visitanteId = typeof corpo?.visitanteId === "string" ? corpo.visitanteId : "";
  const sessao = typeof corpo?.sessao === "string" ? corpo.sessao.slice(0, 40) : "";
  if (!webinarId || !VISITANTE_VALIDO.test(visitanteId) || !sessao) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  // Aba fechada (sendBeacon no pagehide): sai da lista na hora
  if (corpo?.saindo === true) {
    await prisma.presenca.updateMany({
      where: { webinarId, visitanteId },
      data: { ultimoSinal: new Date(Date.now() - (ONLINE_ATE_SEGUNDOS + 1) * 1000) },
    });
    return new NextResponse(null, { status: 204 });
  }

  const pagina = corpo?.pagina === "replay" ? "replay" : "sala";
  const videoSegundos = Math.max(0, Math.floor(Number(corpo?.videoSegundos) || 0));
  const desde = typeof corpo?.desde === "string" && !Number.isNaN(Date.parse(corpo.desde)) ? new Date(corpo.desde) : null;

  const lead = await getLeadAtual(webinarId);
  const agora = new Date();
  const limiteReentrada = new Date(agora.getTime() - REENTRADA_MS);

  try {
    // Upsert numa consulta so: esse endpoint roda o tempo todo pra cada aba aberta
    await prisma.$executeRaw`
      INSERT INTO "presencas" ("id", "webinar_id", "visitante_id", "lead_id", "pagina", "video_segundos", "entrou_em", "ultimo_sinal")
      VALUES (gen_random_uuid()::text, ${webinarId}, ${visitanteId}, ${lead?.id ?? null}, ${pagina}, ${videoSegundos}, ${agora}, ${agora})
      ON CONFLICT ("webinar_id", "visitante_id") DO UPDATE SET
        "lead_id" = COALESCE(EXCLUDED."lead_id", "presencas"."lead_id"),
        "pagina" = EXCLUDED."pagina",
        "video_segundos" = EXCLUDED."video_segundos",
        "entrou_em" = CASE WHEN "presencas"."ultimo_sinal" < ${limiteReentrada} THEN EXCLUDED."entrou_em" ELSE "presencas"."entrou_em" END,
        "ultimo_sinal" = EXCLUDED."ultimo_sinal"`;
  } catch {
    return NextResponse.json({ erro: "Webinário não encontrado." }, { status: 404 });
  }

  const comentarios: ComentarioAoVivo[] = lead
    ? (
        await prisma.comentario.findMany({
          where: { leadId: lead.id, sessao, ...(desde ? { criadoEm: { gt: desde } } : {}) },
          orderBy: { criadoEm: "asc" },
          take: 200,
          select: { id: true, tipo: true, nomeAutor: true, texto: true, videoSegundos: true, criadoEm: true },
        })
      ).map((comentario) => ({
        ...comentario,
        tipo: comentario.tipo === "suporte" ? "suporte" : "participante",
        criadoEm: comentario.criadoEm.toISOString(),
      }))
    : [];

  return NextResponse.json(
    { comentarios, participante: participanteDoChat(lead) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
