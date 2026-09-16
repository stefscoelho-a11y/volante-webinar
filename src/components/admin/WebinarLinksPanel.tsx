"use client";

import { useState, useSyncExternalStore } from "react";
import { FERRAMENTAS_EMAIL, getPublicBaseUrl, magicLinkQuery, webinarPath } from "@/lib/linksAcesso";

const semInscricao = () => () => {};

type WebinarLinksPanelProps = {
  slug: string;
  tokenSalaTeste: string;
  justInTimeDisponivel: boolean;
  replayAtivo: boolean;
  regenerarTokenAction: () => void | Promise<void>;
  // Quando definido, aplica ?c=<slug> em todos os links abaixo: e o mesmo
  // conjunto de links padrao, so que apontando pra oferta desse canal.
  canalSlug?: string;
};

export function WebinarLinksPanel({
  slug,
  tokenSalaTeste,
  justInTimeDisponivel,
  replayAtivo,
  regenerarTokenAction,
  canalSlug,
}: WebinarLinksPanelProps) {
  // O endereco so existe no navegador: no servidor e na hidratacao fica vazio.
  const origin = useSyncExternalStore(semInscricao, () => getPublicBaseUrl(window.location.origin), () => "");
  const [ferramentaKey, setFerramentaKey] = useState<string>(FERRAMENTAS_EMAIL[0].key);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const ferramenta = FERRAMENTAS_EMAIL.find((item) => item.key === ferramentaKey) ?? FERRAMENTAS_EMAIL[0];
  const magic = magicLinkQuery(ferramenta) + (canalSlug ? `&c=${encodeURIComponent(canalSlug)}` : "");
  const canalQuery = canalSlug ? { c: canalSlug } : undefined;
  const avisoJustInTime = justInTimeDisponivel ? null : "Desativado: habilite o just in time nas configurações abaixo.";

  const links = [
    {
      key: "principal",
      label: "Sala principal",
      path: webinarPath(slug, undefined, canalQuery),
      desc: "Acesso dos participantes à sala. Segue o agendamento e, se o cadastro estiver ligado, pede nome e email antes.",
      aviso: null,
    },
    {
      key: "magic_link",
      label: "Sala com magic link",
      path: `${webinarPath(slug)}?${magic}`,
      desc: "Para disparos de email: a ferramenta preenche nome e email e o participante entra direto, sem cadastro. Os dados saem da URL antes da sala abrir.",
      aviso: null,
    },
    {
      key: "just_in_time",
      label: "Sala com just in time",
      path: webinarPath(slug, "jit", canalQuery),
      desc: "Leva ao cadastro just in time: a sala abre alguns minutos depois que a pessoa se cadastra.",
      aviso: avisoJustInTime,
    },
    {
      key: "just_in_time_magic",
      label: "Sala just in time com magic link",
      path: `${webinarPath(slug, "jit")}?${magic}`,
      desc: "Just in time sem formulário: o cadastro é feito com os dados da URL e a contagem começa no clique.",
      aviso: avisoJustInTime,
    },
    {
      key: "teste",
      label: "Sala teste",
      path: webinarPath(slug, "teste", { k: tokenSalaTeste, ...canalQuery }),
      desc: "Sala liberada para testes: ignora o agendamento, tem controles para pular no vídeo e não registra cadastros nem dispara o Pixel. Não divulgue.",
      aviso: null,
    },
    {
      key: "replay",
      label: "Sala com replay",
      path: webinarPath(slug, "replay", canalQuery),
      desc: "Gravação para depois do evento: só abre após a sessão e respeita o prazo configurado. Também aceita nome e email na URL.",
      aviso: replayAtivo ? null : "Desativado: habilite o replay nas configurações abaixo.",
    },
  ];

  async function copiar(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    } catch {
      // clipboard indisponivel (ex: sem permissao/contexto inseguro) - sem tratamento especial
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Links</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {canalSlug
              ? "Os mesmos links padrão, já apontando para a oferta deste canal."
              : "Um link para cada forma de acesso ao webinário."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Magic link para
          <select
            value={ferramentaKey}
            onChange={(e) => setFerramentaKey(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-100 px-2 py-1 text-xs text-gray-800"
          >
            {FERRAMENTAS_EMAIL.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-5">
        {links.map((link) => {
          const url = `${origin}${link.path}`;
          return (
            <div key={link.key}>
              <p className="mb-1.5 text-sm font-medium text-gray-800">{link.label}</p>
              <div className="flex items-center gap-2">
                <p
                  title={url}
                  className="min-w-0 flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
                >
                  {origin ? url : link.path}
                </p>
                <button
                  type="button"
                  onClick={() => copiar(url, link.key)}
                  className="shrink-0 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-neutral-950 hover:bg-orange-400"
                >
                  {copiedKey === link.key ? "Copiado!" : "Copiar"}
                </button>
                <a
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Abrir
                </a>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">{link.desc}</p>
              {link.aviso && <p className="mt-1 text-xs font-medium text-amber-700">{link.aviso}</p>}
              {link.key === "teste" && !canalSlug && (
                <form action={regenerarTokenAction}>
                  <button type="submit" className="mt-1 text-xs text-gray-500 underline hover:text-gray-800">
                    Gerar novo link de teste (o atual para de funcionar)
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
