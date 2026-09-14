"use client";

import { useEffect, useState } from "react";
import { getElapsedSeconds } from "@/lib/scheduling";

const TICK_MS = 500;

/**
 * Ponteiro compartilhado do "relogio" da sala: quantos segundos ja se
 * passaram desde o inicio da sessao. E o mesmo numero que usamos pra
 * decidir se o webinario encerrou, quando cada mensagem de chat deve
 * aparecer e quando o CTA deve surgir - um unico tick alimentando as tres
 * features, em vez de cada uma ter seu proprio timer.
 */
export function useElapsedSeconds(sessionStart: Date): number {
  const [elapsed, setElapsed] = useState(() => getElapsedSeconds(sessionStart));

  useEffect(() => {
    const initialTick = window.setTimeout(() => setElapsed(getElapsedSeconds(sessionStart)), 0);
    const id = window.setInterval(() => {
      setElapsed(getElapsedSeconds(sessionStart));
    }, TICK_MS);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(id);
    };
  }, [sessionStart]);

  return elapsed;
}
