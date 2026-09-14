import type { Webinar } from "@/generated/prisma/client";
import { FUSO_BRASILIA, type TipoAgendamento } from "@/lib/scheduling";

export const ROTULOS_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  recorrente: "Recorrente",
  fixo: "Fixo",
  agendado: "Agendado",
  just_in_time: "Just in time",
};

export function rotuloTipoAgendamento(tipo: string): string {
  return ROTULOS_TIPO_AGENDAMENTO[tipo as TipoAgendamento] ?? tipo;
}

const formatoAgendado = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO_BRASILIA,
});

function formatarIntervalo(minutos: number): string {
  return minutos % 60 === 0 ? `${minutos / 60} h` : `${minutos} min`;
}

/** Linha curta com a agenda do webinar, pra listagem do admin. */
export function resumoAgenda(
  webinar: Pick<
    Webinar,
    | "tipoAgendamento"
    | "intervaloRecorrenciaMinutos"
    | "horariosFixos"
    | "agendadoDataHoraInicio"
    | "agendadoRepeticao"
    | "delayJustInTimeMinutos"
  >,
): string {
  switch (webinar.tipoAgendamento) {
    case "recorrente":
      return webinar.intervaloRecorrenciaMinutos
        ? `A cada ${formatarIntervalo(webinar.intervaloRecorrenciaMinutos)}`
        : "Intervalo não configurado";
    case "fixo": {
      const horarios = Array.isArray(webinar.horariosFixos)
        ? webinar.horariosFixos.filter((horario) => typeof horario === "string")
        : [];
      return horarios.length > 0 ? `Todo dia às ${horarios.join(", ")}` : "Sem horários configurados";
    }
    case "agendado": {
      if (!webinar.agendadoDataHoraInicio) return "Data não configurada";
      const repeticao =
        webinar.agendadoRepeticao === "diaria"
          ? " · repete todo dia"
          : webinar.agendadoRepeticao === "semanal"
            ? " · repete toda semana"
            : "";
      return `${formatoAgendado.format(webinar.agendadoDataHoraInicio)}${repeticao}`;
    }
    case "just_in_time":
      return `Abre ${webinar.delayJustInTimeMinutos ?? 0} min após o cadastro`;
    default:
      return webinar.tipoAgendamento;
  }
}
