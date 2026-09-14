"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type WebinarStepKey = "inicio" | "agendamento" | "visual" | "oferta" | "audiencia" | "integracoes" | "chat" | "preview";

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
    { key: "chat", label: "Chat Fake", icon: IconChat, href: `/admin/webinars/${webinarId}/chat` },
    { key: "preview", label: "Preview", icon: IconPreview, href: `/admin/webinars/${webinarId}/preview` },
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

export function IconInicio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M5 3v18M5 4h12l-2.5 3L17 10H5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAgendamento({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M12 14v3l2 1.5" />
    </svg>
  );
}

export function IconOferta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <path d="M3 9h18M12 9v12" />
      <path d="M12 9c-2-3-6-3-6-.5C6 9.5 9 9 12 9s6 .5 6-.5c0-2.5-4-2.5-6 .5Z" />
    </svg>
  );
}

export function IconVisual({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 .4-3.6l-.7-.2a1.6 1.6 0 0 1 .4-3.1H16a5 5 0 0 0 5-5c0-3.4-4-6.1-9-6.1Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconAudiencia({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconIntegracoes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M9 3v4M15 3v4M6 7h12l-1 5H7L6 7ZM6.5 12l1 6a2 2 0 0 0 2 1.7h5a2 2 0 0 0 2-1.7l1-6" />
    </svg>
  );
}

export function IconChat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPreview({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
