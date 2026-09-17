"use client";

import { useRouter, useSearchParams } from "next/navigation";

type SeletorWebinarRetencaoProps = {
  webinarios: { id: string; titulo: string }[];
  selecionadoId: string;
};

export function SeletorWebinarRetencao({ webinarios, selecionadoId }: SeletorWebinarRetencaoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selecionar(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("video", id);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <select
      value={selecionadoId}
      onChange={(evento) => selecionar(evento.target.value)}
      className="max-w-[14rem] truncate rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
    >
      {webinarios.map((webinar) => (
        <option key={webinar.id} value={webinar.id}>
          {webinar.titulo}
        </option>
      ))}
    </select>
  );
}
