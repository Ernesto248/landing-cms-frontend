"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Plus, User } from "lucide-react";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { useAdminSession } from "@/components/admin/admin-session-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminLayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, status, user } = useAdminSession();
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (isLoginRoute && status === "authenticated") {
      router.replace("/admin");
      return;
    }

    if (!isLoginRoute && status === "unauthenticated") {
      router.replace("/admin/login");
    }
  }, [isLoginRoute, router, status]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 text-center text-sm font-medium text-[var(--text-muted)]">
        Cargando sesion de admin...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
          <AdminNavigation />

          <div className="min-w-0 space-y-4 pb-32 lg:pb-0">
            <header className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] sm:text-sm">
                    Admin conectado
                  </p>
                  <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:mt-2 sm:text-3xl">
                    Jeni&apos;s Lashes &amp; Brows
                  </h1>
                  <p className="mt-1.5 text-xs leading-6 text-[var(--text-muted)] sm:mt-2 sm:text-sm lg:hidden">
                    Gestiona citas, contenido y finanzas
                  </p>
                </div>

                <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-3">
                  <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-3 py-2.5 text-sm sm:px-4 sm:py-3">
                    <User className="h-4 w-4 text-[var(--text-muted)]" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{user?.fullName}</p>
                      <p className="hidden text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] sm:block">
                        {user?.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Link
                      className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] sm:h-11 sm:px-5 sm:text-sm"
                      href="/admin/citas"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Crear cita</span>
                      <span className="sm:hidden">Cita</span>
                    </Link>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--secondary-btn)] px-4 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn-hover)] sm:h-11 sm:px-5 sm:text-sm"
                      type="button"
                      onClick={() => void logout()}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline">Cerrar sesion</span>
                      <span className="sm:hidden">Salir</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
