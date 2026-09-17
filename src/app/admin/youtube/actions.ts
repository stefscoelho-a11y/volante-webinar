"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desconectarYoutube } from "@/lib/youtubeAnalytics";

export async function desconectarYoutubeAction() {
  await desconectarYoutube();
  revalidatePath("/admin/youtube");
  revalidatePath("/admin");
  redirect("/admin/youtube");
}
