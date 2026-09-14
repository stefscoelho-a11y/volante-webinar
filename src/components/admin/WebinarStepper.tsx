"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  Radio,
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
  | "preview"
  | "ao-vivo";

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
    { key: "ao-vivo", label: "Ao vivo", icon: IconAoVivo, href: `/admin/webinars/${webinarId}/ao-vivo` },
  ];
}

export function WebinarStepper(props: WebinarStepperProps) {
  const { activeKey } = props;
  const steps = props.steps ?? buildStepsAsLinks(props.webinarId);
  const activeIndex = steps.findIndex((step) => step.key === activeKey);

  return (
    <div className="mb-6 overflow-x-auto pb-1">
      <div className="flex min-w-max items-center">
        {steps.map((step, index) => {
          const isActive = step.key === activeKey;
          const isDone = index < activeIndex;
          const Icon = step.icon;

          const content = (
            <div className="flex w-20 flex-col items-center gap-1.5 text-center sm:w-24">
              <Icon
                className={`h-5 w-5 ${isActive ? "text-emerald-600" : isDone ? "text-emerald-500" : "text-gray-400"}`}
              />
              <span className={`text-[11px] font-medium ${isActive ? "text-emerald-600" : "text-gray-500"}`}>
                {step.label}
              </span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {index + 1}
              </span>
            </div>
          );

          return (
            <div key={step.key} className="flex items-center">
              {step.href ? (
                <Link href={step.href} className="transition hover:opacity-75">
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={step.onClick} className="transition hover:opacity-75">
                  {content}
                </button>
              )}
              {index < steps.length - 1 && (
                <div className={`mb-4 h-px w-6 shrink-0 sm:w-10 ${isDone ? "bg-emerald-300" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
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
export const IconAoVivo = Radio;
