import { NextResponse, type NextRequest } from "next/server";
import { getLeadAtual } from "@/lib/leads";
import { registrarEventoFunil } from "@/lib/funil";

const VISITANTE_VALIDO = /^[A-Za-z0-9-]{8,64}$/;

type CorpoClique = {
  webinarId?: unknown;
  visitanteId?: unknown;
  sessao?: unknown;
};

/** Chamado quando o visitante clica no CTA da oferta - ver OfertaBlock.tsx. */
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => null)) as CorpoClique | null;
  const webinarId = typeof corpo?.webinarId === "string" ? corpo.webinarId : "";
  const visitanteId = typeof corpo?.visitanteId === "string" ? corpo.visitanteId : "";
  const sessao = typeof corpo?.sessao === "string" ? corpo.sessao.slice(0, 40) : "";
  if (!webinarId || !VISITANTE_VALIDO.test(visitanteId) || !sessao) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const lead = await getLeadAtual(webinarId);
  await registrarEventoFunil({ webinarId, visitanteId, tipo: "clicou_cta", sessao, leadId: lead?.id });

  return new NextResponse(null, { status: 204 });
}
