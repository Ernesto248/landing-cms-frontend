"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { AdminMobileSheet } from "@/components/admin/admin-mobile-sheet";
import { useAdminSession } from "@/components/admin/admin-session-provider";
import {
  createAdminService,
  deleteAdminExpenseCategory,
  deleteAdminService,
  getAdminExpenseCategories,
  getAdminServiceCategoryNames,
  getAdminServices,
  updateAdminService,
  upsertAdminServiceCategoryNames,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type { ServiceResponse, UpsertServiceRequest } from "@/lib/api/types";
import { formatDuration, formatPrice } from "@/lib/site-content";
import { toast } from "@/lib/toast";

const defaultCategoryNames = ["Brows", "Lashes"] as const;

type ServiceDraft = UpsertServiceRequest;

function emptyDraft(category: string = "Brows"): ServiceDraft {
  return {
    category,
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

function ServiceForm({
  draft,
  setDraft,
  categoryNames,
  editingServiceId,
  isSubmitting,
  onSave,
  onCancel,
  onDelete,
  isDeleting,
}: {
  draft: ServiceDraft;
  setDraft: React.Dispatch<React.SetStateAction<ServiceDraft>>;
  categoryNames: string[];
  editingServiceId: string | null;
  isSubmitting: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {editingServiceId ? "Editar servicio" : "Nuevo servicio"}
          </p>
          <button
            aria-label="Cerrar formulario"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
            type="button"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pt-4">
        <label className="block text-sm font-medium text-[var(--text)]">
          Categoria
          <select
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
            value={draft.category}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
          >
            {categoryNames.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-[var(--text)]">
          Nombre
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Nombre del servicio"
          />
        </label>

        <label className="block text-sm font-medium text-[var(--text)]">
          Descripcion
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
            value={draft.description ?? ""}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value || null }))
            }
          />
        </label>

        <label className="block text-sm font-medium text-[var(--text)]">
          Precio base (CUP)
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
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
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
            inputMode="numeric"
            type="number"
            value={draft.durationMinutes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, durationMinutes: Number(event.target.value) }))
            }
          />
        </label>

        <label className="block text-sm font-medium text-[var(--text)]">
          Orden visual
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
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
            className="h-4 w-4 rounded accent-[var(--accent)]"
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
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
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
            className="h-4 w-4 rounded accent-[var(--accent)]"
            onChange={(event) =>
              setDraft((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
          Activo
        </label>
      </div>

      <div className="shrink-0 flex gap-2 pt-4 border-t border-[var(--secondary-btn)]">
        <button
          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-[var(--accent)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          type="button"
          onClick={onSave}
          disabled={isSubmitting || !draft.name.trim() || draft.basePrice <= 0}
        >
          {isSubmitting
            ? "Guardando..."
            : editingServiceId
              ? "Guardar cambios"
              : "Crear servicio"}
        </button>
        <button
          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-[var(--secondary-btn)] px-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn-hover)]"
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        {onDelete ? (
          <button
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[rgba(145,145,140,0.35)] px-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] disabled:opacity-50"
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CategoryManager({
  categoryNames,
  onAddCategory,
  onRenameCategory,
  onRemoveCategory,
  serviceCountByCategory,
  isSaving,
}: {
  categoryNames: string[];
  onAddCategory: (name: string) => void;
  onRenameCategory: (index: number, newName: string) => void;
  onRemoveCategory: (index: number) => void;
  serviceCountByCategory: Record<string, number>;
  isSaving: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed || categoryNames.includes(trimmed)) return;
    onAddCategory(trimmed);
    setNewName("");
  }

  function handleStartRename(index: number) {
    setEditingIndex(index);
    setEditingName(categoryNames[index]);
  }

  function handleSaveRename() {
    if (editingIndex === null) return;
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== categoryNames[editingIndex]) {
      onRenameCategory(editingIndex, trimmed);
    }
    setEditingIndex(null);
    setEditingName("");
  }

  function handleCancelRename() {
    setEditingIndex(null);
    setEditingName("");
  }

  return (
    <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
      <button
        className="flex w-full items-center justify-between gap-3 text-left"
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
          Categorias
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">
            {categoryNames.length}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-subtle)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-subtle)]" />
          )}
        </div>
      </button>

      {isExpanded ? (
        <>
          <div className="mt-3 space-y-2">
            {categoryNames.map((category, index) => {
              const count = serviceCountByCategory[category] ?? 0;

              return (
                <div
                  key={category}
                  className="flex items-center justify-between gap-2 rounded-[1.2rem] bg-[var(--surface-muted)] px-4 py-2.5"
                >
                  {editingIndex === index ? (
                    <div className="flex flex-1 min-w-0 items-center gap-2">
                      <input
                        autoFocus
                        className="h-9 flex-1 min-w-0 rounded-xl border border-[var(--border-input)] bg-[var(--surface)] px-3 text-sm"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleSaveRename();
                          if (event.key === "Escape") handleCancelRename();
                        }}
                      />
                      <button
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white text-xs font-semibold"
                        type="button"
                        onClick={handleSaveRename}
                      >
                        OK
                      </button>
                      <button
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary-btn)] text-xs font-semibold text-[var(--text)]"
                        type="button"
                        onClick={handleCancelRename}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">
                        {category}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-xs text-[var(--text-subtle)]">{count}</span>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
                          type="button"
                          onClick={() => handleStartRename(index)}
                          aria-label={`Editar categoria ${category}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {count === 0 ? (
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                            type="button"
                            onClick={() => onRemoveCategory(index)}
                            aria-label={`Eliminar categoria ${category}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="h-10 flex-1 min-w-0 rounded-xl border border-[var(--border-input)] bg-[var(--surface)] px-3 text-sm"
              placeholder="Nueva categoria"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAdd();
              }}
            />
            <button
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-40"
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim() || isSaving}
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>

          {isSaving ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-subtle)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Guardando...
            </p>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

export function ServicesEditor() {
  const { accessToken, refresh, status } = useAdminSession();
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([...defaultCategoryNames]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);

  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);
  const inactiveServices = useMemo(() => services.filter((s) => !s.isActive), [services]);
  const serviceCountByCategory = useMemo(
    () =>
      services.reduce<Record<string, number>>((acc, s) => {
        acc[s.category] = (acc[s.category] ?? 0) + 1;
        return acc;
      }, {}),
    [services],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsMobileViewport(event ? event.matches : mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);

      try {
        const [nextServices, nextCategories] = await withRefreshedToken<
          [ServiceResponse[], string[]]
        >(sessionAccessToken, refresh, (currentAccessToken) =>
          Promise.all([
            getAdminServices(currentAccessToken),
            getAdminServiceCategoryNames(currentAccessToken),
          ]),
        );

        if (!isMounted) return;
        setServices(nextServices.sort((a, b) => a.sortOrder - b.sortOrder));
        setCategoryNames(nextCategories);
      } catch {
        if (!isMounted) return;
        toast.error("No se pudieron cargar los datos.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => { isMounted = false; };
  }, [accessToken, refresh, status]);

  async function handleAddCategory(name: string) {
    if (!accessToken) return;
    const nextCategories = [...categoryNames, name];
    setCategoryNames(nextCategories);
    await persistCategories(nextCategories);
  }

  async function handleRenameCategory(index: number, newName: string) {
    if (!accessToken) return;
    const nextCategories = categoryNames.map((c, i) => (i === index ? newName : c));
    setCategoryNames(nextCategories);

    setServices((current) =>
      current.map((s) => {
        if (s.category !== categoryNames[index]) return s;
        return { ...s, category: newName };
      }),
    );

    await persistCategories(nextCategories);
  }

  async function handleRemoveCategory(index: number) {
    if (!accessToken) return;
    const categoryToRemove = categoryNames[index];
    const nextCategories = categoryNames.filter((_, i) => i !== index);
    setCategoryNames(nextCategories);
    await persistCategories(nextCategories);

    if (draft.category === categoryToRemove && nextCategories.length > 0) {
      setDraft((current) => ({ ...current, category: nextCategories[0] }));
    }

    try {
      const expenseCats = await withRefreshedToken(accessToken, refresh, (token) =>
        getAdminExpenseCategories(token),
      );
      const matching = expenseCats.find((c) => c.name === categoryToRemove);
      if (matching) {
        await withRefreshedToken(accessToken, refresh, (token) =>
          deleteAdminExpenseCategory(token, matching.id),
        );
      }
    } catch {
      // best-effort cascade
    }
  }

  async function persistCategories(categories: string[]) {
    if (!accessToken) return;
    setIsSavingCategories(true);
    try {
      await withRefreshedToken(accessToken, refresh, (currentAccessToken) =>
        upsertAdminServiceCategoryNames(currentAccessToken, categories),
      );
    } catch {
      toast.error("No se pudieron guardar las categorias.");
    } finally {
      setIsSavingCategories(false);
    }
  }

  async function saveService() {
    if (!accessToken) return;
    const sessionAccessToken = accessToken;
    setIsSubmitting(true);

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
      setDraft(emptyDraft(categoryNames[0] ?? "Brows"));
      setShowMobileForm(false);
      toast.success(
        editingServiceId
          ? `Servicio "${saved.name}" actualizado.`
          : `Servicio "${saved.name}" creado.`,
      );
    } catch {
      toast.error("No se pudo guardar el servicio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteService() {
    if (!accessToken || !editingServiceId) return;
    const sessionAccessToken = accessToken;
    setIsDeleting(true);

    try {
      await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
        deleteAdminService(currentAccessToken, editingServiceId),
      );

      setServices((current) => current.filter((s) => s.id !== editingServiceId));
      setEditingServiceId(null);
      setDraft(emptyDraft(categoryNames[0] ?? "Brows"));
      setShowMobileForm(false);
      toast.success("Servicio eliminado.");
    } catch {
      toast.error("No se pudo eliminar el servicio.");
    } finally {
      setIsDeleting(false);
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

    if (isMobileViewport) {
      setShowMobileForm(true);
    }
  }

  function startNewService() {
    setEditingServiceId(null);
    setDraft(emptyDraft(categoryNames[0] ?? "Brows"));

    if (isMobileViewport) {
      setShowMobileForm(true);
    }
  }

  function cancelEditing() {
    setEditingServiceId(null);
    setDraft(emptyDraft(categoryNames[0] ?? "Brows"));
    setShowMobileForm(false);
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        Cargando catalogo de servicios...
      </div>
    );
  }

  return (
    <>
      <main className="min-w-0 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="min-w-0 space-y-5">
          <CategoryManager
            categoryNames={categoryNames}
            onAddCategory={handleAddCategory}
            onRenameCategory={handleRenameCategory}
            onRemoveCategory={handleRemoveCategory}
            serviceCountByCategory={serviceCountByCategory}
            isSaving={isSavingCategories}
          />

          <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Catalogo
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)] truncate">
                  Servicios activos e inactivos.
                </h2>
              </div>
              <button
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                type="button"
                onClick={startNewService}
              >
                <Plus className="h-4 w-4" />
                Nuevo servicio
              </button>
            </div>
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
                    className={`min-w-0 overflow-hidden rounded-[1.4rem] px-4 py-4 ${
                      editingServiceId === service.id && !isMobileViewport
                        ? "border border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--text-on-dark)]"
                        : "bg-[var(--surface-muted)] text-[var(--text)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70 truncate">
                          {service.category}
                        </p>
                        <p className="mt-1 font-semibold truncate">{service.name}</p>
                        <p
                          className={`mt-1 text-sm leading-6 line-clamp-2 ${
                            editingServiceId === service.id && !isMobileViewport
                              ? "text-[var(--text-subtle)]"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {service.description ?? "Sin descripcion."}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{formatPrice(service.basePrice)}</p>
                        <p className="mt-1 text-xs opacity-70">{formatDuration(service.durationMinutes)}</p>
                      </div>
                    </div>
                    <button
                      className={`mt-4 inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold transition ${
                        editingServiceId === service.id && !isMobileViewport
                          ? "bg-[var(--surface)]/10 text-white"
                          : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                      }`}
                      type="button"
                      onClick={() => startEditing(service)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
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
                    className={`min-w-0 overflow-hidden rounded-[1.4rem] px-4 py-4 ${
                      editingServiceId === service.id && !isMobileViewport
                        ? "border border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--text-on-dark)]"
                        : "bg-[var(--surface-muted)] text-[var(--text)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70 truncate">
                          {service.category}
                        </p>
                        <p className="mt-1 font-semibold truncate">{service.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{formatPrice(service.basePrice)}</p>
                      </div>
                    </div>
                    <button
                      className={`mt-4 inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold transition ${
                        editingServiceId === service.id && !isMobileViewport
                          ? "bg-[var(--surface)]/10 text-white"
                          : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                      }`}
                      type="button"
                      onClick={() => startEditing(service)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </section>

        <section className="hidden space-y-5 lg:block">
          <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden">
            <ServiceForm
              draft={draft}
              setDraft={setDraft}
              categoryNames={categoryNames}
              editingServiceId={editingServiceId}
              isSubmitting={isSubmitting}
              onSave={() => void saveService()}
              onCancel={cancelEditing}
              onDelete={editingServiceId ? () => void handleDeleteService() : undefined}
              isDeleting={isDeleting}
            />
          </article>
        </section>
      </main>

      <AdminMobileSheet
        open={showMobileForm}
        onClose={cancelEditing}
      >
        <ServiceForm
          draft={draft}
          setDraft={setDraft}
          categoryNames={categoryNames}
          editingServiceId={editingServiceId}
          isSubmitting={isSubmitting}
          onSave={() => void saveService()}
          onCancel={cancelEditing}
          onDelete={editingServiceId ? () => void handleDeleteService() : undefined}
          isDeleting={isDeleting}
        />
      </AdminMobileSheet>
    </>
  );
}
