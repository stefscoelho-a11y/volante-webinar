"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/proxy";

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export async function login(formData: FormData) {
  const senha = formData.get("senha");
  const next = formData.get("next")?.toString() || "/admin/webinars";

  if (typeof senha === "string" && senha.length > 0 && senha === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, senha, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SEVEN_DAYS_SECONDS,
    });
    redirect(next);
  }

  redirect(`/admin/login?erro=1&next=${encodeURIComponent(next)}`);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
