"use client";

import { useState } from "react";
import { formatarTempoHMS, parseTempoHMS } from "@/lib/tempo";

type CampoTempoProps = {
  name: string;
  valorInicial: number | null;
  obrigatorio?: boolean;
  placeholder?: string;
  className: string;
};

/**
 * Tempo do video em hh:mm:ss. Aceita tambem mm:ss ou so segundos e ajusta
 * pro formato completo ao sair do campo. O formulario envia o texto e o
 * servidor converte pra segundos.
 */
export function CampoTempo({ name, valorInicial, obrigatorio = false, placeholder = "00:00:00", className }: CampoTempoProps) {
  const [valor, setValor] = useState(valorInicial === null ? "" : formatarTempoHMS(valorInicial));
  const invalido = valor.trim() !== "" && parseTempoHMS(valor) === null;

  return (
    <>
      <input
        name={name}
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        onBlur={() => {
          const segundos = parseTempoHMS(valor);
          if (segundos !== null) setValor(formatarTempoHMS(segundos));
        }}
        required={obrigatorio}
        inputMode="numeric"
        pattern="\d+(:[0-5]?\d){0,2}"
        title="Use hh:mm:ss, por exemplo 00:02:00"
        placeholder={placeholder}
        aria-invalid={invalido}
        className={`${className} tabular-nums ${invalido ? "border-red-400 focus:border-red-500" : ""}`}
      />
      {invalido && <p className="mt-1 text-xs text-red-600">Use o formato hh:mm:ss, por exemplo 00:02:00.</p>}
    </>
  );
}
