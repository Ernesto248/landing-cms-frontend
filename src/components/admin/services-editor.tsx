"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import {
  createAdminService,
  getAdminServices,
  updateAdminService,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type { ServiceResponse, UpsertServiceRequest } from "@/lib/api/types";
import { formatDuration, formatPrice } from "@/lib/site-content";

const categories = ["Brows", "Lashes"] as const;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallbackMessage;
}

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

      if (nextAccessToken) {
        return operation(nextAccessToken);
      }
    }

    throw error;
  }
}

type ServiceDraft = UpsertServiceRequest;

function emptyDraft(): ServiceDraft {
  return {
    category: "Brows",
    name: "",
    description: null,
    basePrice: 0,
    durationMinutes: 15,
    supportsTouchUp: false,
    touchUpDiscount: 0,
    isActive: true,
    sortOrder: 0,
  };
}

export function ServicesEditor() {
  const { accessToken, refresh, status } = useAdminSession();
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);
  const inactiveServices = useMemo(() => services.filter((s) => !s.isActive), [services]);

  useEffect(() => {
    if (!accessToken || status !== "authenticated") {
      return;
    }

    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadServices() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextServices = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
          getAdminServices(currentAccessToken),
        );

        if (!isMounted) {
          return;
        }

        setServices(nextServices.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error, "No se pudieron cargar los servicios."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refresh, status]);

  async function saveService() {
    if (!accessToken) {
      return;
    }

    const sessionAccessToken = accessToken;
    setIsSubmitting(true);
    setFeedbackMessage("");
    setErrorMessage("");

    try {
      const saved = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) => {
        const payload: UpsertServiceRequest = {
          category: draft.category,
          name: draft.name.trim(),
          description: draft.description ? draft.description.trim() : null,
          basePrice: draft.basePrice,
          durationMinutes: draft.durationMinutes,
          supportsTouchUp: draft.supportsTouchUp,
          touchUpDiscount: draft.touchUpDiscount,
          isActive: draft.isActive,
          sortOrder: draft.sortOrder,
        };

        return editingServiceId
          ? updateAdminService(currentAccessToken, editingServiceId, payload)
          : createAdminService(currentAccessToken, payload);
      });

      setServices((current) => {
        if (editingServiceId) {
          return current
            .map((service) => (service.id === saved.id ? saved : service))
            .sort((a, b) => a.sortOrder - b.sortOrder);
        }

        return [...current, saved].sort((a, b) => a.sortOrder - b.sortOrder);
      });

      setEditingServiceId(null);
      setDraft(emptyDraft());
      setFeedbackMessage(
        editingServiceId
          ? `Servicio "${saved.name}" actualizado.`
          : `Servicio "${saved.name}" creado.`,
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo guardar el servicio."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(service: ServiceResponse) {
    setEditingServiceId(service.id);
    setDraft({
      category: service.category,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      durationMinutes: service.durationMinutes,
      supportsTouchUp: service.supportsTouchUp,
      touchUpDiscount: service.touchUpDiscount,
      isActive: service.isActive,
      sortOrder: service.sortOrder,
    });
    setErrorMessage("");
    setFeedbackMessage("");
  }

  function cancelEditing() {
    setEditingServiceId(null);
    setDraft(emptyDraft());
    setErrorMessage("");
    setFeedbackMessage("");
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        Cargando catalogo de servicios...
      </div>
    );
  }

  return (
    <main className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-5">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Catalogo
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Servicios activos e inactivos.
              </h2>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
              type="button"
              onClick={cancelEditing}
            >
              Nuevo servicio
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-[1.2rem] bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {errorMessage}
            </p>
          ) : null}

          {feedbackMessage ? (
            <p className="mt-4 rounded-[1.2rem] bg-[var(--success-bg)] px-4 py-3 text-sm font-medium text-[var(--success)]">
              {feedbackMessage}
            </p>
          ) : null}
        </article>

        {activeServices.length ? (
          <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
              Activos
            </p>
            <div className="mt-4 space-y-3">
              {activeServices.map((service) => (
                <div
                  key={service.id}
                  className={`rounded-[1.4rem] px-4 py-4 ${
                    editingServiceId === service.id
                      ? "border border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--text-on-dark)]"
                      : "bg-[var(--surface-muted)] text-[var(--text)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                        {service.category}
                      </p>
                      <p className="mt-1 font-semibold">{service.name}</p>
                      <p
                        className={`mt-1 text-sm leading-6 ${
                          editingServiceId === service.id ? "text-[var(--text-subtle)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {service.description ?? "Sin descripcion."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatPrice(service.basePrice)}</p>
                      <p className="mt-1 text-xs opacity-70">{formatDuration(service.durationMinutes)}</p>
                    </div>
                  </div>
                  <button
                    className={`mt-4 inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold ${
                      editingServiceId === service.id
                        ? "bg-[var(--surface)]/10 text-white"
                        : "bg-[var(--surface)] text-[var(--text)]"
                    }`}
                    type="button"
                    onClick={() => startEditing(service)}
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {inactiveServices.length ? (
          <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
              Inactivos
            </p>
            <div className="mt-4 space-y-3">
              {inactiveServices.map((service) => (
                <div
                  key={service.id}
                  className={`rounded-[1.4rem] px-4 py-4 ${
                    editingServiceId === service.id
                      ? "border border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--text-on-dark)]"
                      : "bg-[var(--surface-muted)] text-[var(--text)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                        {service.category}
                      </p>
                      <p className="mt-1 font-semibold">{service.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatPrice(service.basePrice)}</p>
                    </div>
                  </div>
                  <button
                    className={`mt-4 inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold ${
                      editingServiceId === service.id
                        ? "bg-[var(--surface)]/10 text-white"
                        : "bg-[var(--surface)] text-[var(--text)]"
                    }`}
                    type="button"
                    onClick={() => startEditing(service)}
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      <section className="space-y-5">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            {editingServiceId ? "Editar servicio" : "Nuevo servicio"}
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-[var(--text)]">
              Categoria
              <select
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4"
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, category: event.target.value }))
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Nombre
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Descripcion
              <textarea
                className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--border-input)] px-4 py-3"
                value={draft.description ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value || null }))
                }
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Precio base (CUP)
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                inputMode="numeric"
                type="number"
                value={draft.basePrice}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, basePrice: Number(event.target.value) }))
                }
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Duracion (minutos)
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                inputMode="numeric"
                type="number"
                value={draft.durationMinutes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Orden visual
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                inputMode="numeric"
                type="number"
                value={draft.sortOrder}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))
                }
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-[var(--text)]">
              <input
                checked={draft.supportsTouchUp}
                type="checkbox"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, supportsTouchUp: event.target.checked }))
                }
              />
              Soporta retoque
            </label>

            {draft.supportsTouchUp ? (
              <label className="block text-sm font-medium text-[var(--text)]">
                Descuento por retoque (CUP)
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                  inputMode="numeric"
                  type="number"
                  value={draft.touchUpDiscount}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      touchUpDiscount: Number(event.target.value),
                    }))
                  }
                />
              </label>
            ) : null}

            <label className="flex items-center gap-3 text-sm font-medium text-[var(--text)]">
              <input
                checked={draft.isActive}
                type="checkbox"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="flex gap-3">
              <button
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                type="button"
                onClick={() => void saveService()}
                disabled={isSubmitting || !draft.name.trim() || draft.basePrice <= 0}
              >
                {isSubmitting
                  ? "Guardando..."
                  : editingServiceId
                    ? "Guardar cambios"
                    : "Crear servicio"}
              </button>
              {editingServiceId ? (
                <button
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--secondary-btn)] px-4 text-sm font-semibold text-[var(--text)]"
                  type="button"
                  onClick={cancelEditing}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
