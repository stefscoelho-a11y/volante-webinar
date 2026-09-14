import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";
import { ChatScriptEditor } from "@/components/admin/ChatScriptEditor";
import { WebinarStepper } from "@/components/admin/WebinarStepper";
import { duracaoTranscricao, lerSegmentos } from "@/lib/legendas";

export const dynamic = "force-dynamic";

// A geracao do roteiro com IA (server action desta pagina) pode levar alguns
// minutos em webinars longos. 300s e o limite do plano Hobby da Vercel.
export const maxDuration = 300;

type ChatEditorPageProps = { params: Promise<{ id: string }> };

export default async function ChatEditorPage({ params }: ChatEditorPageProps) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    include: {
      chatMessages: { orderBy: [{ ordem: "asc" }, { timestampSegundos: "asc" }] },
      transcricao: true,
    },
  });
  if (!webinar) notFound();

  const videoId = webinar.videoUrl ? extractYouTubeId(webinar.videoUrl) : null;
  if (!videoId) {
    return <p className="text-red-600">Este webinario nao tem um video do YouTube configurado.</p>;
  }

  const segmentos = lerSegmentos(webinar.transcricao?.segmentos);
  const transcricao = webinar.transcricao
    ? {
        nomeArquivo: webinar.transcricao.nomeArquivo,
        totalSegmentos: segmentos.length,
        duracaoSegundos: duracaoTranscricao(segmentos),
      }
    : null;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-xl font-semibold">{webinar.titulo}</h1>
      <WebinarStepper webinarId={webinar.id} activeKey="chat" />
      <ChatScriptEditor
        webinarId={webinar.id}
        videoId={videoId}
        initialMessages={webinar.chatMessages}
        transcricao={transcricao}
        pitchTimestampSeconds={webinar.pitchTimestampSeconds}
      />
    </div>
  );
}
