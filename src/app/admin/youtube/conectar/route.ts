import { NextResponse, type NextRequest } from "next/server";
import { urlAutorizacaoYoutube } from "@/lib/youtubeAnalytics";

export const dynamic = "force-dynamic";

/** Manda o admin pra tela de consentimento da Google - ela redireciona de volta pra /admin/youtube/callback com um `code`. */
export async function GET(request: NextRequest) {
  const url = urlAutorizacaoYoutube();
  if (!url) {
    const erro = encodeURIComponent("Integração não configurada.");
    return NextResponse.redirect(new URL(`/admin/youtube?erro=${erro}`, request.url));
  }
  return NextResponse.redirect(url);
}
