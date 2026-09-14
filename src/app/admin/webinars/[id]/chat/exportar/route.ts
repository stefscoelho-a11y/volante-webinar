import { prisma } from "@/lib/prisma";
import { gerarPlanilhaChat } from "@/lib/chatPlanilha";

export const dynamic = "force-dynamic";

/** Baixa o roteiro salvo do chat em .xlsx, no modelo do HotWebinar (protegido pelo login via proxy). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    select: {
      slug: true,
      chatMessages: { orderBy: [{ timestampSegundos: "asc" }, { ordem: "asc" }] },
    },
  });
  if (!webinar) return new Response("Webinário não encontrado.", { status: 404 });

  const planilha = await gerarPlanilhaChat(webinar.chatMessages);
  return new Response(new Uint8Array(planilha), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="chat-${webinar.slug}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
