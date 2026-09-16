import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lerDadosParticipante, webinarPath } from "@/lib/linksAcesso";
import { lerCanalDaQuery } from "@/lib/canaisOferta";
import { COOKIE_LEAD_OPTIONS, nomeCookieLead, registrarEntrada } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * Destino dos magic links (as paginas de entrada redirecionam pra ca quando
 * a URL traz nome/email). Cadastra ou reencontra o participante, grava o
 * cookie e redireciona pra uma URL limpa, sem dados pessoais.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const search = request.nextUrl.searchParams;
  const via = search.get("via");
  const irPara = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);

  const webinar = await prisma.webinar.findUnique({ where: { slug } });
  if (!webinar || !webinar.ativo) return irPara(webinarPath(slug));

  const paramsObj = Object.fromEntries(search);
  const dados = lerDadosParticipante(paramsObj);
  if (!dados) {
    return irPara(via === "jit" ? webinarPath(slug, "jit") : via === "replay" ? webinarPath(slug, "replay") : webinarPath(slug));
  }

  const { lead, destino } = await registrarEntrada(webinar, dados, via, true, lerCanalDaQuery(paramsObj));
  const response = irPara(destino);
  response.cookies.set(nomeCookieLead(webinar.id), lead.tokenAcesso, COOKIE_LEAD_OPTIONS);
  return response;
}
