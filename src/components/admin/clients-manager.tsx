"use client";

import { Loader2, Pencil, Plus, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import { createAdminClient, getAdminClients, updateAdminClient } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type { ClientResponse, UpsertClientRequest } from "@/lib/api/types";
import { toast } from "@/lib/toast";

type ClientDraft = {
  fullName: string;
  phone: string;
  notes: string;
};

const emptyDraft: ClientDraft = {
  fullName: "",
  phone: "",
  notes: "",
};

async function withRefreshedToken<T>(
  accessToken: string,
  refresh: () => Promise<string | null>,
  operation: (sessionAccessToken: string) => Promise<T>,
) {
  try {
    return await operation(accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const nextAccessToken = await refresh();
      if (nextAccessToken) return operation(nextAccessToken);
    }
    throw error;
  }
}

function normalizeNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toDraft(client: ClientResponse): ClientDraft {
  return {
    fullName: client.fullName,
    phone: client.whatsapp ?? client.phone ?? "",
    notes: client.notes ?? "",
  };
}

function toRequest(draft: ClientDraft): UpsertClientRequest {
  const phone = normalizeNullable(draft.phone);
  return {
    fullName: draft.fullName.trim(),
    phone,
    whatsapp: phone,
    notes: normalizeNullable(draft.notes),
  };
}

export function ClientsManager() {
  const { accessToken, refresh, status } = useAdminSession();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...clients].sort((left, right) => left.fullName.localeCompare(right.fullName));

    if (!query) return sorted;

    return sorted.filter((client) => {
      const phone = client.whatsapp ?? client.phone ?? "";
      return `${client.fullName} ${phone} ${client.notes ?? ""}`.toLowerCase().includes(query);
    });
  }, [clients, search]);

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadClients() {
      setIsLoading(true);

      try {
        const nextClients = await withRefreshedToken(sessionAccessToken, refresh, (token) =>
          getAdminClients(token),
        );
        if (!isMounted) return;
        setClients(nextClients);
      } catch {
        if (!isMounted) return;
        toast.error("No se pudieron cargar las clientas.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refresh, status]);

  function startNewClient() {
    setSelectedClientId(null);
    setDraft(emptyDraft);
  }

  function startEditing(client: ClientResponse) {
    setSelectedClientId(client.id);
    setDraft(toDraft(client));
  }

  async function saveClient() {
    if (!accessToken || !draft.fullName.trim()) return;
    const sessionAccessToken = accessToken;
    setIsSubmitting(true);

    try {
      const payload = toRequest(draft);
      const savedClient = await withRefreshedToken(sessionAccessToken, refresh, (token) =>
        selectedClientId
          ? updateAdminClient(token, selectedClientId, payload)
          : createAdminClient(token, payload),
      );

      setClients((current) => {
        if (selectedClientId) {
          return current.map((client) => (client.id === savedClient.id ? savedClient : client));
        }
        return [...current, savedClient];
      });
      setSelectedClientId(savedClient.id);
      setDraft(toDraft(savedClient));
      toast.success(selectedClientId ? "Clienta actualizada." : "Clienta creada.");
    } catch {
      toast.error(selectedClientId ? "No se pudo actualizar la clienta." : "No se pudo crear la clienta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        Cargando clientas...
      </div>
    );
  }

  return (
    <main className="min-w-0 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
      <section className="min-w-0 space-y-5">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Clientas
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Contactos y notas.
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                {clients.length} clientas registradas.
              </p>
            </div>
            <button
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
              type="button"
              onClick={startNewClient}
            >
              <Plus className="h-4 w-4" />
              Nueva clienta
            </button>
          </div>

          <label className="relative mt-5 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input
              className="h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] pl-11 pr-4 text-sm outline-none transition focus:border-[var(--text)]"
              placeholder="Buscar por nombre, numero o nota"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </article>

        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            Lista
          </p>
          <div className="mt-4 space-y-3">
            {filteredClients.length ? (
              filteredClients.map((client) => {
                const active = client.id === selectedClientId;
                const phone = client.whatsapp ?? client.phone;

                return (
                  <button
                    key={client.id}
                    className={`w-full rounded-[1.4rem] px-4 py-4 text-left transition ${
                      active
                        ? "bg-[var(--surface-inverse)] text-[var(--text-on-dark)]"
                        : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                    }`}
                    type="button"
                    onClick={() => startEditing(client)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{client.fullName}</p>
                        <p className="mt-1 text-sm opacity-70">{phone || "Sin numero"}</p>
                        {client.notes ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 opacity-70">{client.notes}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)]/10">
                          <Pencil className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[1.4rem] bg-[var(--surface-muted)] p-6 text-sm text-[var(--text-muted)]">
                No encontramos clientas con esa busqueda.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="min-w-0">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--accent)]">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {selectedClient ? "Editar clienta" : "Nueva clienta"}
              </p>
              <h3 className="mt-1 truncate text-lg font-semibold text-[var(--text)]">
                {selectedClient?.fullName ?? "Datos basicos"}
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-[var(--text)]">
              Nombre
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                value={draft.fullName}
                onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Nombre de la clienta"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Numero
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                inputMode="tel"
                value={draft.phone}
                onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+53..."
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Notas
              <textarea
                className="mt-2 min-h-36 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Preferencias, observaciones o alergias"
              />
            </label>

            <div className="flex gap-2">
              <button
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                type="button"
                onClick={() => void saveClient()}
                disabled={isSubmitting || !draft.fullName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : selectedClientId ? (
                  "Guardar cambios"
                ) : (
                  "Crear clienta"
                )}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--secondary-btn)] px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn-hover)]"
                type="button"
                onClick={startNewClient}
              >
                Limpiar
              </button>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
