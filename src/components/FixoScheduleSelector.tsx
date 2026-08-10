"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCountdown, parseHorarioNoDia } from "@/lib/scheduling";

type FixoScheduleSelectorProps = {
  slug: string;
  titulo: string;
  horariosFixos: string[];
  videoDurationSeconds: number;
};

export function FixoScheduleSelector({ slug, titulo, horariosFixos, videoDurationSeconds }: FixoScheduleSelectorProps) {
  const router = useRouter();
  // "now" fica atualizado a cada segundo so pra recalcular o status
  // (encerrado / ao vivo / contagem regressiva) de cada horario na tela.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  function entrar(target: Date) {
    router.push(`/w/${slug}/sala?sessionStart=${encodeURIComponent(target.toISOString())}`);
  }

  const horarios = horariosFixos
    .map((horario) => ({ horario, target: parseHorarioNoDia(horario, now) }))
    .filter((item): item is { horario: string; target: Date } => item.target !== null)
    .sort((a, b) => a.target.getTime() - b.target.getTime());

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-semibold">{titulo}</h1>
        <p className="mb-4 text-sm text-gray-500">Escolha um horario para assistir hoje:</p>

        <div className="space-y-2">
          {horarios.map(({ horario, target }) => {
            const endTime = new Date(target.getTime() + videoDurationSeconds * 1000);
            const encerrado = now.getTime() >= endTime.getTime();
            const aoVivo = !encerrado && now.getTime() >= target.getTime();
            const secondsUntil = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));

            return (
              <button
                key={horario}
                type="button"
                disabled={encerrado}
                onClick={() => entrar(target)}
                className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left transition ${
                  encerrado
                    ? "cursor-not-allowed border-gray-200 text-gray-400"
                    : "border-gray-300 bg-white hover:border-emerald-500"
                }`}
              >
                <span className="font-medium">{horario}</span>
                {encerrado && <span className="text-xs">Encerrado hoje</span>}
                {aoVivo && <span className="text-xs font-semibold text-emerald-600">Ao vivo agora</span>}
                {!encerrado && !aoVivo && (
                  <span className="text-xs text-gray-500" suppressHydrationWarning>
                    Comeca em {formatCountdown(secondsUntil)}
                  </span>
                )}
              </button>
            );
          })}
          {horarios.length === 0 && <p className="text-gray-500">Nenhum horario configurado ainda.</p>}
        </div>
      </div>
    </div>
  );
}
