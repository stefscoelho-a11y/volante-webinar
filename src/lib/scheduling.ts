/**
 * Logica de sincronismo "fake-live": em vez de guardar em algum lugar em que
 * ponto do video cada espectador esta, calculamos tudo a partir do relogio.
 * Dado o horario em que uma "sessao" comecou (sessionStart), o ponto certo do
 * video pra qualquer espectador, a qualquer momento, e sempre:
 *
 *   elapsedSeconds = (agora - sessionStart) em segundos
 *
 * Isso e o que permite recarregar a pagina e cair no mesmo ponto (ou mais
 * adiante, nunca do zero): o calculo nao depende de nenhum estado local do
 * player, so do relogio real.
 */

export const TIPOS_AGENDAMENTO = ["fixo", "recorrente", "just_in_time", "agendado"] as const;
export type TipoAgendamento = (typeof TIPOS_AGENDAMENTO)[number];

export const REPETICOES_AGENDADO = ["nenhuma", "diaria", "semanal"] as const;
export type RepeticaoAgendado = (typeof REPETICOES_AGENDADO)[number];

/**
 * Formata um Date pro formato que <input type="datetime-local"> espera
 * ("YYYY-MM-DDTHH:mm", em horario local - sem timezone). Usado so pra
 * preencher o formulario do admin com o valor ja salvo.
 */
export function toDatetimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const ano = date.getFullYear();
  const mes = pad(date.getMonth() + 1);
  const dia = pad(date.getDate());
  const horas = pad(date.getHours());
  const minutos = pad(date.getMinutes());
  return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
}

/**
 * tipo "recorrente": a sessao mais proxima e calculada alinhando o relogio a
 * um marco fixo (Unix epoch, em UTC) e "fatiando" o tempo em blocos de
 * `intervaloMinutos`. Isso garante que o calculo seja deterministico e
 * sobreviva a reinicios do servidor (nao dependemos de guardar a hora da
 * "ultima sessao" em lugar nenhum).
 */
export function getRecorrenteSessionStart(intervaloMinutos: number, now: Date = new Date()): Date {
  const intervaloMs = intervaloMinutos * 60_000;
  const nowMs = now.getTime();
  const sessionStartMs = Math.floor(nowMs / intervaloMs) * intervaloMs;
  return new Date(sessionStartMs);
}

/**
 * tipo "fixo": horariosFixos e uma lista de horarios "HH:mm" (horario local
 * do servidor) que se repetem todo dia. Escolhemos o horario mais recente que
 * ja comecou hoje; se nenhum horario de hoje ja comecou, usamos o ultimo
 * horario de ontem (a sessao de ontem ainda pode estar "rolando" se for
 * proxima da meia-noite, ou simplesmente cai no estado de "encerrado" mais à
 * frente quando comparado a duracao do video).
 */
export function getFixoSessionStart(horariosFixos: string[], now: Date = new Date()): Date | null {
  if (!horariosFixos || horariosFixos.length === 0) return null;

  const candidatosHoje = horariosFixos
    .map((horario) => parseHorarioNoDia(horario, now))
    .filter((data): data is Date => data !== null && data.getTime() <= now.getTime())
    .sort((a, b) => b.getTime() - a.getTime());

  if (candidatosHoje.length > 0) return candidatosHoje[0];

  const ontem = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const candidatosOntem = horariosFixos
    .map((horario) => parseHorarioNoDia(horario, ontem))
    .filter((data): data is Date => data !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  return candidatosOntem[0] ?? null;
}

export function parseHorarioNoDia(horario: string, dia: Date): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(horario.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  const data = new Date(dia);
  data.setHours(horas, minutos, 0, 0);
  return data;
}

/**
 * tipo "just_in_time": a sessao comeca X minutos depois que o lead se
 * cadastrou (entrouEm + delayMinutos).
 */
export function getJustInTimeSessionStart(entrouEm: Date, delayMinutos: number): Date {
  return new Date(entrouEm.getTime() + delayMinutos * 60_000);
}

export function getElapsedSeconds(sessionStart: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
}

export function isSessaoEncerrada(elapsedSeconds: number, videoDurationSeconds: number): boolean {
  return elapsedSeconds >= videoDurationSeconds;
}

/**
 * Pra "recorrente", o boundary mais recente (getRecorrenteSessionStart) pode
 * ja ter encerrado ha um tempo (se o video for mais curto que o intervalo).
 * Nesse caso, a sessao "mais proxima" de verdade e a PROXIMA - assim a pagina
 * de entrada pode mostrar uma contagem regressiva em vez de um beco sem
 * saida "encerrado, sem info nenhuma".
 */
export function getSessaoRecorrenteAlcancavel(intervaloMinutos: number, videoDurationSeconds: number, now: Date = new Date()): Date {
  const sessionStart = getRecorrenteSessionStart(intervaloMinutos, now);
  const elapsed = getElapsedSeconds(sessionStart, now);
  if (isSessaoEncerrada(elapsed, videoDurationSeconds)) {
    return new Date(sessionStart.getTime() + intervaloMinutos * 60_000);
  }
  return sessionStart;
}

/**
 * tipo "agendado": um inicio especifico (data + hora) que pode ou nao se
 * repetir (diariamente ou semanalmente) ate uma data de fim. Retorna a
 * sessao alcancavel mais proxima, igual o "recorrente": se a ocorrencia mais
 * recente ja encerrou, pula pra proxima (em vez de travar num "encerrado"
 * sem info nenhuma). Retorna null quando a serie ja passou de vez do fim
 * configurado (nao ha mais nenhuma ocorrencia futura).
 */
export function getAgendadoSessionStart(
  inicio: Date,
  repeticao: RepeticaoAgendado,
  fim: Date | null,
  videoDurationSeconds: number,
  now: Date = new Date(),
): Date | null {
  if (repeticao === "nenhuma") {
    return inicio;
  }

  const passoMs = repeticao === "diaria" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  // Ainda nao chegou a primeira ocorrencia: essa e a "mais proxima".
  if (now.getTime() < inicio.getTime()) {
    return inicio;
  }

  const passosDecorridos = Math.floor((now.getTime() - inicio.getTime()) / passoMs);
  let candidato = new Date(inicio.getTime() + passosDecorridos * passoMs);

  const elapsed = getElapsedSeconds(candidato, now);
  if (isSessaoEncerrada(elapsed, videoDurationSeconds)) {
    candidato = new Date(candidato.getTime() + passoMs);
  }

  if (fim && candidato.getTime() > fim.getTime()) {
    return null;
  }

  return candidato;
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}
