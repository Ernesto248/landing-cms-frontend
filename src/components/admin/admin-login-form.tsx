"use client";

import { Loader2, Lock, LogIn, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import { ApiError } from "@/lib/api/http";

export function AdminLoginForm() {
  const router = useRouter();
  const { login, status } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login({ email, password });
      router.replace("/admin");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setErrorMessage(
            "Correo o contrasena invalidos. Usa ADMIN_EMAIL y ADMIN_PASSWORD configurados en backend/.env.",
          );
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage(
          "No se pudo iniciar sesion. Verifica que el backend este disponible y que NEXT_PUBLIC_API_BASE_URL apunte al API correcto.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:rounded-[2rem] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Admin login</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-3xl">
              Acceso privado
            </h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          Inicia sesion con las credenciales de administrador configuradas en <code className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">backend/.env</code>.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[var(--text)]">
            Correo
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                className="h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] pl-11 pr-4 text-sm outline-none ring-0 transition focus:border-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]/10"
                type="email"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-[var(--text)]">
            Contrasena
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                className="h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] pl-11 pr-4 text-sm outline-none ring-0 transition focus:border-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]/10"
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-[1.2rem] bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              <span className="mt-0.5 shrink-0">!</span>
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--text-subtle)]"
            type="submit"
            disabled={isSubmitting || status === "loading"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Continuar
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}