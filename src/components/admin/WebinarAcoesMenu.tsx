"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Copy,
  Download,
  Link2,
  MessageSquare,
  MoreVertical,
  Pencil,
  PlayCircle,
  Radio,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { classeBotaoIcone } from "./BotaoIcone";

type WebinarAcoesMenuProps = {
  webinarId: string;
  titulo: string;
  totalCadastros: number;
  duplicarAction: () => void | Promise<void>;
  excluirAction: () => void | Promise<void>;
};

const classeItem =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50";

export function WebinarAcoesMenu({
  webinarId,
  titulo,
  totalCadastros,
  duplicarAction,
  excluirAction,
}: WebinarAcoesMenuProps) {
  const [aberto, setAberto] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fecharAoClicarFora(evento: MouseEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEsc);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEsc);
    };
  }, [aberto]);

  const base = `/admin/webinars/${webinarId}`;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        title="Mais ações"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((valor) => !valor)}
        className={classeBotaoIcone}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          <Link role="menuitem" href={`${base}/links`} className={classeItem}>
            <Link2 className="h-4 w-4 text-gray-400" />
            Links
          </Link>
          <Link role="menuitem" href={`${base}/ao-vivo`} className={classeItem}>
            <Radio className="h-4 w-4 text-gray-400" />
            Ao vivo
          </Link>
          <Link role="menuitem" href={`${base}/editar`} className={classeItem}>
            <Pencil className="h-4 w-4 text-gray-400" />
            Editar
          </Link>
          <Link role="menuitem" href={`${base}/chat`} className={classeItem}>
            <MessageSquare className="h-4 w-4 text-gray-400" />
            Roteiro de chat
          </Link>
          <Link role="menuitem" href={`${base}/preview`} className={classeItem}>
            <PlayCircle className="h-4 w-4 text-gray-400" />
            Preview
          </Link>
          <form action={duplicarAction}>
            <button role="menuitem" type="submit" className={classeItem}>
              <Copy className="h-4 w-4 text-gray-400" />
              Duplicar
            </button>
          </form>
          <a role="menuitem" href={`${base}/exportar`} download className={classeItem}>
            <Download className="h-4 w-4 text-gray-400" />
            Exportar JSON
          </a>
          <div className="my-1 border-t border-gray-100" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setAberto(false);
              setConfirmandoExclusao(true);
            }}
            className={`${classeItem} text-red-600 hover:bg-red-50`}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      )}

      {confirmandoExclusao && (
        <ConfirmarExclusao
          titulo={titulo}
          totalCadastros={totalCadastros}
          excluirAction={excluirAction}
          onCancelar={() => setConfirmandoExclusao(false)}
        />
      )}
    </div>
  );
}

function ConfirmarExclusao({
  titulo,
  totalCadastros,
  excluirAction,
  onCancelar,
}: {
  titulo: string;
  totalCadastros: number;
  excluirAction: () => void | Promise<void>;
  onCancelar: () => void;
}) {
  useEffect(() => {
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [onCancelar]);

  const cadastros =
    totalCadastros === 1 ? "1 cadastro de participante" : `${totalCadastros} cadastros de participantes`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCancelar();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-excluir-webinar"
        className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="titulo-excluir-webinar" className="text-base font-semibold text-gray-900">
              Excluir webinário?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              <strong className="font-medium text-gray-800">{titulo}</strong> será apagado com o roteiro do chat e a
              transcrição{totalCadastros > 0 ? `, além de ${cadastros}` : ""}. Os links públicos param de funcionar e
              não dá para desfazer.
            </p>
          </div>
        </div>
        <form action={excluirAction} className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <BotaoConfirmarExclusao />
        </form>
      </div>
    </div>
  );
}

function BotaoConfirmarExclusao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
    >
      {pending ? "Excluindo..." : "Excluir webinário"}
    </button>
  );
}
