import { redirect } from "next/navigation";
import type { Webinar } from "@/generated/prisma/client";
import { CadastroForm } from "@/components/CadastroForm";
import { lerUtms, salaJustInTimePath, textoJustInTime, type ViaEntrada } from "@/lib/linksAcesso";
import { campoOcultoCanal } from "@/lib/canaisOferta";
import { getLeadAtual, leadCadastrado, sessaoJustInTimeAtiva } from "@/lib/leads";
import { cadastrar } from "./actions";

type EntradaJustInTimeProps = {
  webinar: Webinar;
  via: ViaEntrada;
  query: Record<string, string | string[] | undefined>;
};

/**
 * Cadastro just in time - usado pela sala principal (webinar do tipo just in
 * time) e pelo link /{slug}/jit. Quem ja tem uma sessao aguardando ou ao
 * vivo volta direto pra ela, sem reiniciar a contagem.
 */
export async function EntradaJustInTime({ webinar, via, query }: EntradaJustInTimeProps) {
  const lead = await getLeadAtual(webinar.id);
  if (lead && sessaoJustInTimeAtiva(lead, webinar.videoDurationSeconds)) {
    redirect(salaJustInTimePath(webinar.slug, lead.tokenAcesso));
  }

  return (
    <CadastroForm
      titulo={webinar.titulo}
      descricao={textoJustInTime(webinar.delayJustInTimeMinutos ?? 0)}
      botao="Garantir minha vaga"
      action={cadastrar.bind(null, webinar.slug, via)}
      camposOcultos={{ ...lerUtms(query), ...campoOcultoCanal(query) }}
      nomeInicial={leadCadastrado(lead) ? lead.nome : undefined}
      emailInicial={lead?.email ?? undefined}
    />
  );
}
