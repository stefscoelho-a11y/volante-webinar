"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Filter, LayoutDashboard, LogOut, Menu, MonitorPlay, PlayCircle, Radio, X } from "lucide-react";
import { logout } from "@/app/admin/login/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/webinars", label: "Webinários", icon: MonitorPlay, exact: false },
  { href: "/admin/ao-vivo", label: "Ao vivo", icon: Radio, exact: false },
  { href: "/admin/funil", label: "Funil de Conversão", icon: Filter, exact: false },
];

const classeItemMenu = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-ui min-h-screen bg-gray-50 text-gray-900 lg:flex">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <Marca />
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <aside
        className={`${mobileOpen ? "flex" : "hidden"} flex-col border-b border-gray-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r`}
      >
        <div className="hidden px-5 pb-5 pt-6 lg:block">
          <Marca />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-3 lg:py-0">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`${classeItemMenu} ${
                  active ? "bg-orange-500/10 text-orange-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <form action={logout}>
            <button
              type="submit"
              className={`${classeItemMenu} w-full text-gray-600 hover:bg-gray-100 hover:text-gray-900`}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Marca() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-neutral-950">
        <PlayCircle className="h-[18px] w-[18px]" />
      </span>
      <span className="text-lg font-bold tracking-tight text-gray-900">
        Volante <span className="text-orange-600">Webinar</span>
      </span>
    </Link>
  );
}
