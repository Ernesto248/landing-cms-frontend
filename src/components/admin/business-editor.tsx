"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import {
  createAdminScheduleBlock,
  deleteAdminScheduleBlock,
  getAdminBusinessHours,
  getAdminScheduleBlocks,
  updateAdminBusinessHours,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type {
  BusinessHourResponse,
  ScheduleBlockResponse,
  UpsertBusinessHourRequest,
} from "@/lib/api/types";
import { addMonthsToIsoDate, getHavanaIsoDate } from "@/lib/havana-time";

const daysOfWeek = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
  { value: 7, label: "Domingo" },
];

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

function getTodayIsoDate() {
  return getHavanaIsoDate();
}

function addMonths(isoDate: string, amount: number) {
  return addMonthsToIsoDate(isoDate, amount);
}

export function BusinessEditor() {
  const { accessToken, refresh, status } = useAdminSession();

  // Business hours
  const [hours, setHours] = useState<BusinessHourResponse[]>([]);
  const [hoursDraft, setHoursDraft] = useState<UpsertBusinessHourRequest[]>([]);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  // Schedule blocks
  const [blocks, setBlocks] = useState<ScheduleBlockResponse[]>([]);
  const [blocksFrom, setBlocksFrom] = useState(getTodayIsoDate);
  const blocksTo = addMonths(blocksFrom, 1);
  const [newBlockDate, setNewBlockDate] = useState(getTodayIsoDate);
  const [newBlockReason, setNewBlockReason] = useState("");
  const [newBlockStartTime, setNewBlockStartTime] = useState("");
  const [newBlockEndTime, setNewBlockEndTime] = useState("");
  const [newBlockIsFullDay, setNewBlockIsFullDay] = useState(true);

  // Shared
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (!accessToken || status !== "authenticated") {
      return;
    }

    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadBusinessData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [nextHours, nextBlocks] = await withRefreshedToken<
          [BusinessHourResponse[], ScheduleBlockResponse[]]
        >(sessionAccessToken, refresh, (currentAccessToken) =>
          Promise.all([
            getAdminBusinessHours(currentAccessToken),
            getAdminScheduleBlocks(currentAccessToken, blocksFrom, blocksTo),
          ]),
        );

        if (!isMounted) {
          return;
        }

        const sortedHours = nextHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        setHours(sortedHours);
        setHoursDraft(
          sortedHours.map((hour) => ({
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
          })),
        );
        setBlocks(nextBlocks.sort((a, b) => a.blockDate.localeCompare(b.blockDate)));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error, "No se pudieron cargar los horarios."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBusinessData();

    return () => {
      isMounted = false;
    };
  }, [accessToken, blocksFrom, blocksTo, refresh, status]);

  async function saveHours() {
    if (!accessToken) {
      return;
    }

    const sessionAccessToken = accessToken;
    setIsSubmitting(true);
    setFeedbackMessage("");
    setErrorMessage("");

    try {
      const saved = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
        updateAdminBusinessHours(currentAccessToken, hoursDraft),
      );

      setHours(saved.sort((a, b) => a.dayOfWeek - b.dayOfWeek));
      setFeedbackMessage("Horarios actualizados.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudieron guardar los horarios."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createBlock() {
    if (!accessToken) {
      return;
    }

    const sessionAccessToken = accessToken;
    setIsSubmitting(true);
    setFeedbackMessage("");
    setErrorMessage("");

    try {
      const saved = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
        createAdminScheduleBlock(currentAccessToken, {
          blockDate: newBlockDate,
          startTime: newBlockIsFullDay ? null : normalizeTime(newBlockStartTime),
          endTime: newBlockIsFullDay ? null : normalizeTime(newBlockEndTime),
          reason: newBlockReason.trim() || null,
          isFullDay: newBlockIsFullDay,
        }),
      );

      setBlocks((current) => [...current, saved].sort((a, b) => a.blockDate.localeCompare(b.blockDate)));
      setNewBlockReason("");
      setNewBlockStartTime("");
      setNewBlockEndTime("");
      setNewBlockIsFullDay(true);
      setFeedbackMessage(`Bloqueo creado para el ${saved.blockDate}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo crear el bloqueo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteBlock(blockId: string) {
    if (!accessToken) {
      return;
    }

    const sessionAccessToken = accessToken;
    setIsSubmitting(true);
    setFeedbackMessage("");
    setErrorMessage("");

    try {
      await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
        deleteAdminScheduleBlock(currentAccessToken, blockId),
      );

      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setFeedbackMessage("Bloqueo eliminado.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo eliminar el bloqueo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function normalizeTime(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  const blockMonthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 6; i++) {
      options.push(addMonthsToIsoDate(getTodayIsoDate(), i).slice(0, 7));
    }
    return options;
  }, []);

  if (status === "loading" || isLoading) {
    return (
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        Cargando horarios del negocio...
      </div>
    );
  }

  return (
    <main className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      {/* Business hours */}
      <section className="space-y-5">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Horarios
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Horario semanal del negocio.
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                {hours.filter((h) => !h.isClosed).length} dias activos configurados.
              </p>
            </div>
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

        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <button
            className="flex w-full items-center justify-between gap-3 text-left"
            type="button"
            onClick={() => setHoursExpanded((current) => !current)}
          >
            <span className="text-lg font-semibold text-[var(--text)]">
              Editar horarios
            </span>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {hoursExpanded ? "Abierto" : "Editar"}
            </span>
          </button>

          {hoursExpanded ? (
            <div className="mt-4 space-y-4">
              {daysOfWeek.map((day, index) => {
                const hour = hoursDraft.find((h) => h.dayOfWeek === day.value);
                if (!hour) {
                  return null;
                }

                return (
                  <div key={day.value} className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text)]">{day.label}</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          checked={hour.isClosed}
                          type="checkbox"
                          onChange={(event) => {
                            const next = [...hoursDraft];
                            next[index] = { ...next[index], isClosed: event.target.checked };
                            setHoursDraft(next);
                          }}
                        />
                        Cerrado
                      </label>
                    </div>

                    {!hour.isClosed ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="block text-sm font-medium text-[var(--text)]">
                          Apertura
                          <input
                            className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4"
                            type="time"
                            value={hour.openTime ?? ""}
                            onChange={(event) => {
                              const next = [...hoursDraft];
                              next[index] = {
                                ...next[index],
                                openTime: normalizeTime(event.target.value),
                              };
                              setHoursDraft(next);
                            }}
                          />
                        </label>
                        <label className="block text-sm font-medium text-[var(--text)]">
                          Cierre
                          <input
                            className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4"
                            type="time"
                            value={hour.closeTime ?? ""}
                            onChange={(event) => {
                              const next = [...hoursDraft];
                              next[index] = {
                                ...next[index],
                                closeTime: normalizeTime(event.target.value),
                              };
                              setHoursDraft(next);
                            }}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                type="button"
                onClick={() => void saveHours()}
                disabled={isSubmitting}
              >
                Guardar horarios
              </button>
            </div>
          ) : null}
        </article>
      </section>

      {/* Schedule blocks */}
      <section className="space-y-5">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Bloqueos
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Dias bloqueados en agenda.
              </h2>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            Nuevo bloqueo
          </p>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-[var(--text)]">
              Fecha
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                type="date"
                value={newBlockDate}
                onChange={(event) => setNewBlockDate(event.target.value)}
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-[var(--text)]">
              <input
                checked={newBlockIsFullDay}
                type="checkbox"
                onChange={(event) => setNewBlockIsFullDay(event.target.checked)}
              />
              Dia completo
            </label>

            {!newBlockIsFullDay ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-[var(--text)]">
                  Desde
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                    type="time"
                    value={newBlockStartTime}
                    onChange={(event) => setNewBlockStartTime(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">
                  Hasta
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                    type="time"
                    value={newBlockEndTime}
                    onChange={(event) => setNewBlockEndTime(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <label className="block text-sm font-medium text-[var(--text)]">
              Motivo
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                value={newBlockReason}
                onChange={(event) => setNewBlockReason(event.target.value)}
                placeholder="Vacaciones, feriado, etc."
              />
            </label>

            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
              type="button"
              onClick={() => void createBlock()}
              disabled={isSubmitting}
            >
              Crear bloqueo
            </button>
          </div>
        </article>

        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
              Bloqueos activos
            </p>
            <label className="text-sm font-medium text-[var(--text)]">
              <select
                className="mt-1 h-11 rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-3 text-sm"
                value={blocksFrom.slice(0, 7)}
                onChange={(event) => setBlocksFrom(`${event.target.value}-01`)}
              >
                {blockMonthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 space-y-3">
            {blocks.length ? (
              blocks.map((block) => (
                <article key={block.id} className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{block.blockDate}</p>
                      {!block.isFullDay && (block.startTime || block.endTime) ? (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {block.startTime ?? "--:--"} - {block.endTime ?? "--:--"}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Dia completo</p>
                      )}
                      {block.reason ? (
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{block.reason}</p>
                      ) : null}
                    </div>
                    <button
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]"
                      type="button"
                      onClick={() => void deleteBlock(block.id)}
                      disabled={isSubmitting}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4 text-sm leading-7 text-[var(--text-muted)]">
                No hay bloqueos para el periodo seleccionado.
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
