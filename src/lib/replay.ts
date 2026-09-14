/**
 * Regras do link de replay: so abre depois da sessao, pode ter liberacao com
 * data marcada e prazo de expiracao (data fixa e/ou X horas depois de
 * liberado - vale o que acontecer primeiro).
 */

type WebinarReplay = {
  replayAtivo: boolean;
  replayLiberarEm: Date | null;
  replayExpirarEm: Date | null;
  replayDuracaoHoras: number | null;
  tipoAgendamento: string;
  agendadoDataHoraInicio: Date | null;
  videoDurationSeconds: number;
};

export type StatusReplay =
  | { estado: "desativado" }
  | { estado: "aguardando"; liberaEm: Date }
  | { estado: "liberado"; expiraEm: Date | null }
  | { estado: "expirado" };

/**
 * Quando o replay abre, nesta ordem: data marcada no admin; fim da sessao do
 * proprio participante; fim da primeira sessao de um webinar agendado.
 * Recorrente/fixo sem participante identificado nao tem "a sessao" de
 * referencia (sempre ja houve uma antes), entao retorna null = ja liberado.
 */
export function getReplayLiberaEm(webinar: WebinarReplay, sessaoDoParticipante: Date | null): Date | null {
  if (webinar.replayLiberarEm) return webinar.replayLiberarEm;
  const inicio =
    sessaoDoParticipante ?? (webinar.tipoAgendamento === "agendado" ? webinar.agendadoDataHoraInicio : null);
  return inicio ? new Date(inicio.getTime() + webinar.videoDurationSeconds * 1000) : null;
}

export function getStatusReplay(
  webinar: WebinarReplay,
  sessaoDoParticipante: Date | null,
  now: Date = new Date(),
): StatusReplay {
  if (!webinar.replayAtivo) return { estado: "desativado" };

  const liberaEm = getReplayLiberaEm(webinar, sessaoDoParticipante);
  if (liberaEm && now.getTime() < liberaEm.getTime()) return { estado: "aguardando", liberaEm };

  const prazos: number[] = [];
  if (webinar.replayExpirarEm) prazos.push(webinar.replayExpirarEm.getTime());
  if (liberaEm && webinar.replayDuracaoHoras) {
    prazos.push(liberaEm.getTime() + webinar.replayDuracaoHoras * 60 * 60 * 1000);
  }
  const expiraEm = prazos.length > 0 ? new Date(Math.min(...prazos)) : null;
  if (expiraEm && now.getTime() >= expiraEm.getTime()) return { estado: "expirado" };

  return { estado: "liberado", expiraEm };
}
