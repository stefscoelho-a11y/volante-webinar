"use client";

import { Trash2 } from "lucide-react";

type RemoverMembroButtonProps = {
  email: string;
  action: () => void | Promise<void>;
};

export function RemoverMembroButton({ email, action }: RemoverMembroButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(evento) => {
        if (!window.confirm(`Remover "${email}" da equipe? A sessão dele para de funcionar na hora.`)) {
          evento.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        title="Remover da equipe"
        aria-label="Remover da equipe"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remover
      </button>
    </form>
  );
}
