"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles, User } from "lucide-react";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { useAdminSession } from "@/components/admin/admin-session-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminLayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user } = useAdminSession();
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
            <header className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] sm:rounded-[2rem]">
              <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:p-6">
                <div className="min-w-0 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] sm:text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Panel administrativo
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-3xl">
                      Jeni&apos;s Lashes &amp; Brows
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                      Gestiona citas, contenido y finanzas desde un espacio mas claro y enfocado.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:p-4 lg:min-w-[18rem] lg:justify-end">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--accent)] shadow-sm">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">{user?.fullName}</p>
                      <p className="truncate text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {user?.role}
                      </p>
                    </div>
                  </div>
                  <ThemeToggle />
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
