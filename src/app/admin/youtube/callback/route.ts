import { NextResponse, type NextRequest } from "next/server";
import { buscarCanalConectado, salvarConexao, trocarCodigoPorTokens } from "@/lib/youtubeAnalytics";

export const dynamic = "force-dynamic";

/** Destino do redirect da Google apos o admin autorizar (ou recusar) o acesso. */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const erroGoogle = search.get("error");
  const code = search.get("code");

  function irParaComErro(mensagem: string) {
    return NextResponse.redirect(new URL(`/admin/youtube?erro=${encodeURIComponent(mensagem)}`, request.url));
  }

  if (erroGoogle) return irParaComErro(`A Google recusou a autorização (${erroGoogle}).`);
  if (!code) return irParaComErro("Código de autorização ausente no retorno da Google.");

  try {
    const { accessToken, refreshToken } = await trocarCodigoPorTokens(code);
    if (!refreshToken) {
      return irParaComErro(
        "A Google não devolveu um token de acesso permanente. Tente desconectar no Google e conectar de novo.",
      );
    }
    const canal = await buscarCanalConectado(accessToken);
    await salvarConexao(refreshToken, canal);
  } catch (erro) {
    return irParaComErro(erro instanceof Error ? erro.message : "Falha ao conectar com o YouTube.");
  }

  return NextResponse.redirect(new URL("/admin/youtube?conectado=1", request.url));
}
