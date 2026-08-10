import { NextResponse, type NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookie && cookie === process.env.ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
