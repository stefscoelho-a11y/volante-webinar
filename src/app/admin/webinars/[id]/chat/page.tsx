import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import { ChatScriptEditor } from "@/components/admin/ChatScriptEditor";
import { WebinarStepper } from "@/components/admin/WebinarStepper";

export const dynamic = "force-dynamic";

type ChatEditorPageProps = { params: Promise<{ id: string }> };

export default async function ChatEditorPage({ params }: ChatEditorPageProps) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    include: { chatMessages: { orderBy: [{ ordem: "asc" }, { timestampSegundos: "asc" }] } },
  });
  if (!webinar) notFound();

  const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
  if (!videoId) {
    return <p className="text-red-600">Este webinario nao tem um video do YouTube configurado.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-xl font-semibold">{webinar.titulo}</h1>
      <WebinarStepper webinarId={webinar.id} activeKey="chat" />
      <ChatScriptEditor webinarId={webinar.id} videoId={videoId} initialMessages={webinar.chatMessages} />
    </div>
  );
}
