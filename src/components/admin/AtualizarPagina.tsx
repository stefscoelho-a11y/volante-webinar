"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Busca de novo os dados da pagina (server component) de tempo em tempo, sem
 * perder o que esta aberto na tela. Pausa com a aba em segundo plano.
 */
export function AtualizarPagina({ intervaloMs }: { intervaloMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, intervaloMs);
    return () => window.clearInterval(id);
  }, [router, intervaloMs]);

  return null;
}
