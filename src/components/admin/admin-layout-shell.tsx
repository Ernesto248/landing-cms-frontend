"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { User } from "lucide-react";

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
              <div className="flex items-center justify-between gap-3 p-4 sm:p-5 lg:p-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--accent)] shadow-sm">
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
            </header>

            <div className="flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
