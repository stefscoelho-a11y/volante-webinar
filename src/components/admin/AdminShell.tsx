"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/login/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: IconDashboard, exact: true },
  { href: "/admin/webinars", label: "Webinários", icon: IconWebinars, exact: false },
  { href: "/admin/funil", label: "Funil de Conversão", icon: IconFunnel, exact: false },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:flex">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 lg:hidden">
        <span className="font-semibold tracking-tight">Volante Webinar</span>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Abrir menu"
          className="text-gray-500 hover:text-gray-900"
        >
          <IconMenu />
        </button>
      </div>

      <aside
        className={`${mobileOpen ? "flex" : "hidden"} flex-col border-b border-gray-200 bg-white/60 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:border-b-0 lg:border-r`}
      >
        <div className="hidden p-5 lg:block">
          <span className="text-lg font-semibold tracking-tight">Volante Webinar</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <IconLogout />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconWebinars() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
      <rect x="2.5" y="4.5" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 17.5V21" />
      <path d="M10.5 8.5v4l3.5-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFunnel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
      <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4Z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
