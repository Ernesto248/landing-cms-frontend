"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Scissors,
  Clock,
  Wallet,
} from "lucide-react";

const navigation = [
  { href: "/admin", label: "Resumen", shortLabel: "Resumen", icon: LayoutDashboard },
  { href: "/admin/citas", label: "Citas", shortLabel: "Citas", icon: CalendarDays },
  { href: "/admin/contenido", label: "Contenido", shortLabel: "CMS", icon: FileText },
  { href: "/admin/finanzas", label: "Finanzas", shortLabel: "Finanzas", icon: Wallet },
  { href: "/admin/servicios", label: "Servicios", shortLabel: "Servic.", icon: Scissors },
  { href: "/admin/horarios", label: "Horarios", shortLabel: "Horario", icon: Clock },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-6 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            Navegacion
          </p>
          <nav className="mt-4 grid gap-2">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/90 px-2 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1.5">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-[1rem] px-2 py-3 transition ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--secondary-btn)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
