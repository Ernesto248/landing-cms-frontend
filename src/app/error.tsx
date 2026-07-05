"use client";

import { RotateCcw } from "lucide-react";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10 text-[var(--text)]">
      <section className="w-full max-w-md rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-center sm:rounded-[2rem] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Servicio no disponible
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          No se pudo cargar el contenido.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          El sitio necesita conectarse al API para mostrar la informacion actualizada.
          Intenta de nuevo en unos momentos.
        </p>
        <button
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          type="button"
          onClick={() => reset()}
        >
          <RotateCcw className="h-4 w-4" />
          Reintentar
        </button>
      </section>
    </main>
  );
}
