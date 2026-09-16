"use client";

import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { ROTULOS_TIPO_AGENDAMENTO } from "@/lib/webinarResumo";

type FiltrosWebinarsProps = {
  q: string;
  status: string;
  tipo: string;
  ordem: string;
};

const OPCOES_ORDEM: [string, string][] = [
  ["recentes", "Mais recentes"],
  ["antigos", "Mais antigos"],
  ["nome", "Nome (A–Z)"],
];

const OPCOES_STATUS: [string, string][] = [
  ["", "Todos os status"],
  ["ativo", "Ativos"],
  ["inativo", "Inativos"],
];

const OPCOES_TIPO: [string, string][] = [["", "Todos os tipos"], ...Object.entries(ROTULOS_TIPO_AGENDAMENTO)];

/** Busca e filtros por query string: os selects aplicam na hora, a busca no Enter. */
export function FiltrosWebinars({ q, status, tipo, ordem }: FiltrosWebinarsProps) {
  return (
    <form
      method="get"
      onChange={(evento) => {
        if ((evento.target as HTMLElement).tagName === "SELECT") evento.currentTarget.requestSubmit();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="relative w-full sm:w-80">
        <span className="sr-only">Pesquisar</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Pesquisar por nome ou URL"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
        />
      </label>
      <Select nome="ordem" rotulo="Ordenar" valor={ordem} opcoes={OPCOES_ORDEM} />
      <Select nome="status" rotulo="Status" valor={status} opcoes={OPCOES_STATUS} />
      <Select nome="tipo" rotulo="Tipo de agendamento" valor={tipo} opcoes={OPCOES_TIPO} />
      {(q || status || tipo) && (
        <Link href="/admin/webinars" className="px-2 text-sm font-medium text-gray-500 hover:text-gray-900">
          Limpar filtros
        </Link>
      )}
    </form>
  );
}

function Select({
  nome,
  rotulo,
  valor,
  opcoes,
}: {
  nome: string;
  rotulo: string;
  valor: string;
  opcoes: [string, string][];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{rotulo}</span>
      <select
        name={nome}
        defaultValue={valor}
        className="h-10 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm font-medium text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
      >
        {opcoes.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </label>
  );
}
