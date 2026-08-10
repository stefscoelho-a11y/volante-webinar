"use client";

import { useEffect, useState } from "react";

type WebinarLinksPanelProps = {
  slug: string;
};

const LINKS = [
  {
    key: "agendamento",
    label: "Link de agendamento",
    desc: "Página pública de entrada (onde o lead escolhe ou aguarda a sessão)",
    path: (slug: string) => `/w/${slug}`,
  },
  {
    key: "sala",
    label: "Link da sala",
    desc: "Acesso direto à sala, já na sessão calculada pelo agendamento",
    path: (slug: string) => `/w/${slug}/sala`,
  },
  {
    key: "replay",
    label: "Link de replay",
    desc: "Assistir a qualquer momento, sem depender do agendamento",
    path: (slug: string) => `/w/${slug}/replay`,
  },
];

export function WebinarLinksPanel({ slug }: WebinarLinksPanelProps) {
  const [origin, setOrigin] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!slug) return null;

  async function copiar(path: string, key: string) {
    try {
      await navigator.clipboard.writeText(`${origin}${path}`);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    } catch {
      // clipboard indisponivel (ex: sem permissao/contexto inseguro) - sem tratamento especial
    }
  }

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Links do webinário</h3>
      <div className="space-y-2">
        {LINKS.map((link) => {
          const path = link.path(slug);
          return (
            <div
              key={link.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700">{link.label}</p>
                <p className="truncate text-xs text-gray-500">
                  {origin || "..."}
                  {path}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => copiar(path, link.key)}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  {copiedKey === link.key ? "Copiado!" : "Copiar"}
                </button>
                <a
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Abrir
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
