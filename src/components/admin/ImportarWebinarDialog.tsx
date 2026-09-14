"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { FileJson, Upload } from "lucide-react";
import { importarWebinar } from "@/app/admin/webinars/actions";

export function ImportarWebinarDialog() {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction] = useActionState(importarWebinar, null);

  useEffect(() => {
    if (!aberto) return;
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        <Upload className="h-4 w-4" />
        Importar JSON
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setAberto(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-importar-webinar"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <FileJson className="h-5 w-5" />
              </span>
              <div>
                <h2 id="titulo-importar-webinar" className="text-base font-semibold text-gray-900">
                  Importar webinário
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  Envie um arquivo .json exportado de outro webinário. Ele vira um webinário novo e inativo, com todas
                  as configurações, o roteiro do chat e a transcrição.
                </p>
              </div>
            </div>

            <form action={formAction} className="mt-5">
              <input
                type="file"
                name="arquivo"
                accept="application/json,.json"
                required
                className="block w-full cursor-pointer rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 file:mr-3 file:cursor-pointer file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
              />
              {estado?.erro && <p className="mt-2 text-sm text-red-600">{estado.erro}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <BotaoImportar />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function BotaoImportar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
    >
      {pending ? "Importando..." : "Importar"}
    </button>
  );
}
