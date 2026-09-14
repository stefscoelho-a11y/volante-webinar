import { prisma } from "@/lib/prisma";
import { exportarJson, pacoteDoWebinar } from "@/lib/webinarConfig";

export const dynamic = "force-dynamic";

/** Baixa as configuracoes do webinar em JSON (protegido pelo login do admin via proxy). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    include: { chatMessages: true, transcricao: true },
  });
  if (!webinar) return new Response("Webinário não encontrado.", { status: 404 });

  const dataArquivo = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(exportarJson(pacoteDoWebinar(webinar)), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="webinar-${webinar.slug}-${dataArquivo}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
