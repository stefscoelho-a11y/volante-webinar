import Link from "next/link";

export type EventoCalendario = {
  webinarId: string;
  titulo: string;
  horario: string;
};

export type CelulaCalendario = {
  chave: string;
  dia: number;
  noMesAtual: boolean;
  hoje: boolean;
  eventos: EventoCalendario[];
};

type WebinarCalendarioMesProps = {
  tituloMes: string;
  celulas: CelulaCalendario[];
  hrefMesAnterior: string;
  hrefProximoMes: string;
  hrefHoje: string;
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_EVENTOS_POR_CELULA = 3;

export function WebinarCalendarioMes({
  tituloMes,
  celulas,
  hrefMesAnterior,
  hrefProximoMes,
  hrefHoje,
}: WebinarCalendarioMesProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">{tituloMes}</h2>
        <div className="flex items-center gap-1.5">
          <Link
            href={hrefHoje}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Hoje
          </Link>
          <Link
            href={hrefMesAnterior}
            aria-label="Mês anterior"
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            ‹
          </Link>
          <Link
            href={hrefProximoMes}
            aria-label="Próximo mês"
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-center">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="bg-gray-50 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {dia}
          </div>
        ))}

        {celulas.map((celula) => {
          const extras = celula.eventos.length - MAX_EVENTOS_POR_CELULA;
          return (
            <div
              key={celula.chave}
              className={`min-h-[5.5rem] bg-white p-1.5 text-left sm:min-h-[7rem] sm:p-2 ${
                celula.noMesAtual ? "" : "bg-gray-50/60"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  celula.hoje
                    ? "bg-orange-500 font-semibold text-neutral-950"
                    : celula.noMesAtual
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {celula.dia}
              </span>

              <div className="mt-1 space-y-1">
                {celula.eventos.slice(0, MAX_EVENTOS_POR_CELULA).map((evento, i) => (
                  <Link
                    key={`${evento.webinarId}-${i}`}
                    href={`/admin/webinars/${evento.webinarId}/editar`}
                    title={`${evento.horario} · ${evento.titulo}`}
                    className="block truncate rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 hover:bg-orange-500/20"
                  >
                    {evento.horario} {evento.titulo}
                  </Link>
                ))}
                {extras > 0 && <p className="px-1.5 text-[10px] text-gray-400">+{extras} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
