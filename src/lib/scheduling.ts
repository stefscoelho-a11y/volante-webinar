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

export const REPETICOES_AGENDADO = ["nenhuma", "diaria", "semanal", "mensal"] as const;
export type RepeticaoAgendado = (typeof REPETICOES_AGENDADO)[number];

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

/**
 * Fuso das datas e horarios configurados no admin. O servidor (Vercel) roda
 * em UTC, entao o fuso local do processo nao serve de referencia. O Brasil
 * nao tem horario de verao desde 2019, por isso o offset e fixo em -03:00.
 */
export const FUSO_BRASILIA = "America/Sao_Paulo";
const OFFSET_BRASILIA_MS = -3 * 60 * 60 * 1000;

/**
 * Horario "HH:mm" (de Brasilia) no dia de calendario de Brasilia em que
 * `dia` cai. Da o mesmo resultado no servidor e no navegador, em qualquer
 * fuso - a sala valida no servidor o horario escolhido no navegador.
 */
export function parseHorarioNoDia(horario: string, dia: Date): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(horario.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  const diaBrasilia = new Date(dia.getTime() + OFFSET_BRASILIA_MS);
  const utcMs =
    Date.UTC(diaBrasilia.getUTCFullYear(), diaBrasilia.getUTCMonth(), diaBrasilia.getUTCDate(), horas, minutos) -
    OFFSET_BRASILIA_MS;
  return new Date(utcMs);
}

/**
 * tipo "fixo", quando o participante escolheu um horario na pagina de
 * entrada (/{slug}/sala?h=HH:mm). O horario precisa estar na lista
 * configurada - a URL nao pode inventar uma sessao. Se o horario de hoje
 * ainda nao chegou mas a sessao de ontem nesse horario continua rolando
 * (virada da meia-noite), vale a de ontem.
 */
export function getFixoSessionStartParaHorario(
  horario: string,
  horariosFixos: string[],
  videoDurationSeconds: number,
  now: Date = new Date(),
): Date | null {
  if (!horariosFixos.includes(horario)) return null;
  const hoje = parseHorarioNoDia(horario, now);
  if (!hoje) return null;
  if (hoje.getTime() > now.getTime()) {
    const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
    if (!isSessaoEncerrada(getElapsedSeconds(ontem, now), videoDurationSeconds)) return ontem;
  }
  return hoje;
}

/** Valor de <input type="datetime-local"> interpretado como horario de Brasilia. */
export function parseDatetimeLocalBrasilia(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, ano, mes, dia, horas, minutos] = match.map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, horas, minutos) - OFFSET_BRASILIA_MS);
}

/** Inverso de parseDatetimeLocalBrasilia, pra preencher o formulario do admin. */
export function toDatetimeLocalBrasilia(date: Date | null): string {
  if (!date) return "";
  return new Date(date.getTime() + OFFSET_BRASILIA_MS).toISOString().slice(0, 16);
}

/**
 * Horario "HH:mm" (Brasilia) de "inicio + duracaoMaximaSegundos" - inverso do
 * calculo feito ao salvar (ver calcularDuracaoMaximaSegundos em
 * src/app/admin/webinars/actions.ts). Usado so pra preencher o formulario de
 * edicao com o horario de fim ja salvo.
 */
export function horarioFimAgendado(inicio: Date, duracaoMaximaSegundos: number | null): string {
  if (duracaoMaximaSegundos == null) return "";
  const fim = new Date(inicio.getTime() + duracaoMaximaSegundos * 1000);
  const brasilia = new Date(fim.getTime() + OFFSET_BRASILIA_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(brasilia.getUTCHours())}:${pad(brasilia.getUTCMinutes())}`;
}

export function formatarDataHoraBrasilia(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO_BRASILIA }).format(
    date,
  );
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

/** Componentes do calendario de Brasilia (ano/mes 0-indexado/dia/hora/minuto) de um instante UTC. */
function componentesBrasilia(data: Date) {
  const brasilia = new Date(data.getTime() + OFFSET_BRASILIA_MS);
  return {
    ano: brasilia.getUTCFullYear(),
    mes: brasilia.getUTCMonth(),
    dia: brasilia.getUTCDate(),
    horas: brasilia.getUTCHours(),
    minutos: brasilia.getUTCMinutes(),
  };
}

/** Instante UTC correspondente a um horario de Brasilia (mes 0-indexado). */
function instanteBrasilia(ano: number, mes: number, dia: number, horas: number, minutos: number): Date {
  return new Date(Date.UTC(ano, mes, dia, horas, minutos) - OFFSET_BRASILIA_MS);
}

/**
 * Soma `meses` meses de calendario (horario de Brasilia) a partir de `data`,
 * preservando dia e horario. Se o dia nao existir no mes de destino (ex: 31
 * de fevereiro), cai no ultimo dia daquele mes.
 */
function somarMesesBrasilia(data: Date, meses: number): Date {
  const c = componentesBrasilia(data);
  const alvoMes = c.mes + meses;
  const anoAlvo = c.ano + Math.floor(alvoMes / 12);
  const mesAlvo = ((alvoMes % 12) + 12) % 12;
  const ultimoDiaDoMes = new Date(Date.UTC(anoAlvo, mesAlvo + 1, 0)).getUTCDate();
  const diaAlvo = Math.min(c.dia, ultimoDiaDoMes);
  return instanteBrasilia(anoAlvo, mesAlvo, diaAlvo, c.horas, c.minutos);
}

/**
 * Se `duracaoMaximaSegundos` estiver configurada (fecha a sala nesse horario
 * do dia mesmo com o video mais longo - ver Webinar.agendadoDuracaoMaximaSegundos),
 * ela vence sobre a duracao real do video.
 */
export function duracaoEfetivaSegundos(videoDurationSeconds: number, duracaoMaximaSegundos: number | null): number {
  return duracaoMaximaSegundos != null ? Math.min(videoDurationSeconds, duracaoMaximaSegundos) : videoDurationSeconds;
}

/**
 * tipo "agendado": um inicio especifico (data + hora) que pode ou nao se
 * repetir (diaria, semanal ou mensal) ate uma data de fim - ou pra sempre, se
 * `fim` for nulo, ate ser pausado (`pausado`). Retorna a sessao alcancavel
 * mais proxima, igual o "recorrente": se a ocorrencia mais recente ja
 * encerrou, pula pra proxima (em vez de travar num "encerrado" sem info
 * nenhuma). Retorna null quando pausado ou quando a serie ja passou do fim
 * configurado (nao ha mais nenhuma ocorrencia futura).
 */
export function getAgendadoSessionStart(
  inicio: Date,
  repeticao: RepeticaoAgendado,
  fim: Date | null,
  pausado: boolean,
  videoDurationSeconds: number,
  now: Date = new Date(),
): Date | null {
  if (pausado) return null;
  if (repeticao === "nenhuma") return inicio;

  // Ainda nao chegou a primeira ocorrencia: essa e a "mais proxima".
  if (now.getTime() < inicio.getTime()) {
    return inicio;
  }

  let candidato: Date;

  if (repeticao === "mensal") {
    // Cada ocorrencia e sempre "inicio + N meses" (nunca "ocorrencia anterior
    // + 1 mes"): senao, um inicio no dia 31 que cai num fevereiro (dia 28)
    // "gruda" nesse dia menor pro resto da serie, em vez de voltar pro 31
    // assim que um mes com 31 dias aparecer de novo. Mes nao tem duracao fixa
    // em ms, entao avanca mes a mes (horario de Brasilia) ate achar a
    // ocorrencia mais recente que ja comecou. Limite de seguranca de 50 anos:
    // nunca deveria bater nisso na pratica.
    let meses = 0;
    candidato = inicio;
    for (let i = 0; i < 600; i++) {
      const proximo = somarMesesBrasilia(inicio, meses + 1);
      if (proximo.getTime() > now.getTime()) break;
      meses += 1;
      candidato = proximo;
    }
    const elapsed = getElapsedSeconds(candidato, now);
    if (isSessaoEncerrada(elapsed, videoDurationSeconds)) {
      candidato = somarMesesBrasilia(inicio, meses + 1);
    }
  } else {
    const passoMs = repeticao === "diaria" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const passosDecorridos = Math.floor((now.getTime() - inicio.getTime()) / passoMs);
    candidato = new Date(inicio.getTime() + passosDecorridos * passoMs);

    const elapsed = getElapsedSeconds(candidato, now);
    if (isSessaoEncerrada(elapsed, videoDurationSeconds)) {
      candidato = new Date(candidato.getTime() + passoMs);
    }
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
