"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  CalendarClock,
  Eye,
  Flag,
  Gift,
  Link2,
  MessageSquare,
  Palette,
  PlayCircle,
  Plug,
} from "lucide-react";

export type WebinarStepKey =
  | "inicio"
  | "agendamento"
  | "visual"
  | "oferta"
  | "audiencia"
  | "integracoes"
  | "links"
  | "chat"
  | "preview";

type IconComponent = (props: { className?: string }) => ReactNode;

type StepDef =
  | { key: WebinarStepKey; label: string; icon: IconComponent; href: string; onClick?: undefined }
  | { key: WebinarStepKey; label: string; icon: IconComponent; onClick: () => void; href?: undefined };

type WebinarStepperProps =
  | { steps: StepDef[]; activeKey: WebinarStepKey; webinarId?: undefined }
  // Usado pelas paginas de Chat Fake e Preview, que nao ficam dentro do
  // WebinarForm: so passam o id e o componente monta o stepper inteiro como
  // links reais (inclusive as etapas do formulario, que abrem
  // /editar?step=X direto na etapa certa). Nao pode ser uma funcao chamada
  // no Server Component - esse arquivo e "use client", entao a montagem
  // da lista precisa acontecer aqui dentro.
  | { webinarId: string; activeKey: WebinarStepKey; steps?: undefined };

function buildStepsAsLinks(webinarId: string): StepDef[] {
  return [
    { key: "inicio", label: "Início", icon: IconInicio, href: `/admin/webinars/${webinarId}/editar?step=inicio` },
    {
      key: "agendamento",
      label: "Agendamento",
      icon: IconAgendamento,
      href: `/admin/webinars/${webinarId}/editar?step=agendamento`,
    },
    { key: "visual", label: "Visual", icon: IconVisual, href: `/admin/webinars/${webinarId}/editar?step=visual` },
    { key: "oferta", label: "Oferta", icon: IconOferta, href: `/admin/webinars/${webinarId}/editar?step=oferta` },
    {
      key: "audiencia",
      label: "Audiência",
      icon: IconAudiencia,
      href: `/admin/webinars/${webinarId}/editar?step=audiencia`,
    },
    {
      key: "integracoes",
      label: "Integrações",
      icon: IconIntegracoes,
      href: `/admin/webinars/${webinarId}/editar?step=integracoes`,
    },
    { key: "links", label: "Links", icon: IconLinks, href: `/admin/webinars/${webinarId}/links` },
    { key: "chat", label: "Chat Fake", icon: IconChat, href: `/admin/webinars/${webinarId}/chat` },
    { key: "preview", label: "Preview", icon: IconPreview, href: `/admin/webinars/${webinarId}/preview` },
  ];
}

// Etapas que sao ferramentas (paginas proprias) e nao parte do formulario:
// ficam depois de um separador.
const FERRAMENTAS = new Set<WebinarStepKey>(["links", "chat", "preview"]);

export function WebinarStepper(props: WebinarStepperProps) {
  const { activeKey } = props;
  const steps = props.steps ?? buildStepsAsLinks(props.webinarId);

  return (
    <nav aria-label="Etapas do webinário" className="mb-6 overflow-x-auto border-b border-gray-200">
      <div className="flex min-w-max items-center gap-1">
        {steps.map((step, index) => {
          const isActive = step.key === activeKey;
          const Icon = step.icon;
          const abreFerramentas = FERRAMENTAS.has(step.key) && (index === 0 || !FERRAMENTAS.has(steps[index - 1].key));
          const classe = `-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
            isActive
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
          }`;
          const conteudo = (
            <>
              <Icon className="h-4 w-4 shrink-0" />
              {step.label}
            </>
          );

          return (
            <Fragment key={step.key}>
              {abreFerramentas && <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-gray-200" />}
              {step.href ? (
                <Link href={step.href} aria-current={isActive ? "page" : undefined} className={classe}>
                  {conteudo}
                </Link>
              ) : (
                <button type="button" onClick={step.onClick} aria-current={isActive ? "step" : undefined} className={classe}>
                  {conteudo}
                </button>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}

// Icones das etapas (lucide-react)
export const IconInicio = Flag;
export const IconAgendamento = CalendarClock;
export const IconVisual = Palette;
export const IconOferta = Gift;
export const IconAudiencia = Eye;
export const IconIntegracoes = Plug;
export const IconLinks = Link2;
export const IconChat = MessageSquare;
export const IconPreview = PlayCircle;
