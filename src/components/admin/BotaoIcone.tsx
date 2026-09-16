import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export const classeBotaoIcone =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700";

type BotaoIconeProps = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  externo?: boolean;
};

export function BotaoIcone({ href, rotulo, icone: Icone, externo = false }: BotaoIconeProps) {
  return (
    <Link
      href={href}
      title={rotulo}
      aria-label={rotulo}
      target={externo ? "_blank" : undefined}
      rel={externo ? "noopener noreferrer" : undefined}
      className={classeBotaoIcone}
    >
      <Icone className="h-4 w-4" />
    </Link>
  );
}
