import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, lerSessao } from "@/lib/adminAuth";

// O Proxy roda em Node.js (nao Edge), entao pode consultar o Prisma direto
// aqui: a sessao de um membro removido (linha deletada) para de valer na
// proxima requisicao, sem precisar de logout.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const sessao = await lerSessao(cookie);
  if (sessao) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
