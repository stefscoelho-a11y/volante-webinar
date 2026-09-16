"use client";

import { useState } from "react";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { WebinarLinksPanel } from "./WebinarLinksPanel";
import { CanalOfertaForm, type CanalOfertaFormValues, type WebinarBaseOferta } from "./CanalOfertaForm";

type CanalOfertaCardProps = {
  canal: CanalOfertaFormValues & { id: string };
  slugWebinar: string;
  tokenSalaTeste: string;
  justInTimeDisponivel: boolean;
  replayAtivo: boolean;
  webinarBase: WebinarBaseOferta;
  atualizarAction: (formData: FormData) => void | Promise<void>;
  excluirAction: () => void | Promise<void>;
};

const botaoClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700";

export function CanalOfertaCard({
  canal,
  slugWebinar,
  tokenSalaTeste,
  justInTimeDisponivel,
  replayAtivo,
  webinarBase,
  atualizarAction,
  excluirAction,
}: CanalOfertaCardProps) {
  const [modo, setModo] = useState<"resumo" | "editar" | "links">("resumo");

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{canal.nome}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-500">?c={canal.slug}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setModo((atual) => (atual === "links" ? "resumo" : "links"))}
            aria-pressed={modo === "links"}
            className={`${botaoClass} ${modo === "links" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
          >
            <Link2 className="h-3.5 w-3.5" /> Links
          </button>
          <button
            type="button"
            onClick={() => setModo((atual) => (atual === "editar" ? "resumo" : "editar"))}
            aria-pressed={modo === "editar"}
            className={`${botaoClass} ${modo === "editar" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <form
            action={excluirAction}
            onSubmit={(evento) => {
              if (!window.confirm(`Excluir o canal "${canal.nome}"? O link dele para de funcionar.`)) {
                evento.preventDefault();
              }
            }}
          >
            <button type="submit" className={`${botaoClass} text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700`}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </form>
        </div>
      </div>

      {modo === "links" && (
        <div className="border-t border-gray-100 p-4">
          <WebinarLinksPanel
            slug={slugWebinar}
            tokenSalaTeste={tokenSalaTeste}
            justInTimeDisponivel={justInTimeDisponivel}
            replayAtivo={replayAtivo}
            regenerarTokenAction={async () => {}}
            canalSlug={canal.slug}
          />
        </div>
      )}

      {modo === "editar" && (
        <div className="border-t border-gray-100 p-4">
          <CanalOfertaForm action={atualizarAction} values={canal} botao="Salvar canal" webinarBase={webinarBase} />
        </div>
      )}
    </div>
  );
}
