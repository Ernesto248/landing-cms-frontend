"use client";

import {
  AlertCircle,
  Calendar,
  Check,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import {
  createAdminExpense,
  createAdminExpenseCategory,
  getAdminExpenseCategories,
  getAdminRangeFinanceSummary,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import { getHavanaIsoDate } from "@/lib/havana-time";
import type {
  DailyFinanceEntry,
  ExpenseCategoryResponse,
  ExpenseResponse,
  RangeFinanceResponse,
} from "@/lib/api/types";

type DateFilter = "today" | "week" | "month" | "custom";

type FinanceDraft = {
  detail: string;
  amount: string;
  expenseDate: string;
  expenseCategoryId: string;
  notes: string;
};

function todayString() {
  return getHavanaIsoDate();
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  const prefix = value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(0)} CUP`;
}

function formatDayLabel(dateStr: string) {
  const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const date = new Date(dateStr + "T12:00:00");
  return `${days[date.getDay()]} ${date.getDate()}`;
}

function getFilterRange(filter: DateFilter, customFrom: string, customTo: string) {
  const today = todayString();
  switch (filter) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: daysAgo(6), to: today };
    case "month":
      return { from: daysAgo(29), to: today };
    default:
      return { from: customFrom || today, to: customTo || today };
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
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
      if (nextAccessToken) return operation(nextAccessToken);
    }
    throw error;
  }
}

const FILTER_LABELS: Record<DateFilter, string> = {
  today: "Hoy",
  week: "Ultima semana",
  month: "Ultimo mes",
  custom: "Personalizado",
};

const FILTERS: DateFilter[] = ["today", "week", "month", "custom"];

export function FinanceDashboard() {
  const { accessToken, refresh, status } = useAdminSession();
  const [activeFilter, setActiveFilter] = useState<DateFilter>("month");
  const [customFrom, setCustomFrom] = useState(daysAgo(6));
  const [customTo, setCustomTo] = useState(todayString());
  const [rangeData, setRangeData] = useState<RangeFinanceResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [draft, setDraft] = useState<FinanceDraft>({
    detail: "",
    amount: "0",
    expenseDate: todayString(),
    expenseCategoryId: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const { from, to } = getFilterRange(activeFilter, customFrom, customTo);
  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );

  const chartData = useMemo(() => {
    if (!rangeData?.days?.length) return [];
    return rangeData.days.map((day: DailyFinanceEntry) => ({
      label: formatDayLabel(day.date),
      Ingresos: day.income,
      Gastos: day.expenses,
    }));
  }, [rangeData]);

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadFinance() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [nextRange, nextCategories] = await withRefreshedToken<
          [RangeFinanceResponse, ExpenseCategoryResponse[]]
        >(sessionAccessToken, refresh, (currentAccessToken) =>
          Promise.all([
            getAdminRangeFinanceSummary(currentAccessToken, from, to),
            getAdminExpenseCategories(currentAccessToken),
          ]),
        );
        if (!isMounted) return;
        setRangeData(nextRange);
        setExpenses(nextRange.expenses);
        setCategories(nextCategories);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "No se pudieron cargar las finanzas."));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadFinance();
    return () => { isMounted = false; };
  }, [accessToken, from, to, refresh, status]);

  async function handleCreateCategory() {
    if (!accessToken || !categoryName.trim()) return;
    setIsSubmitting(true);
    setFeedbackMessage("");
    setErrorMessage("");

    try {
      const sessionAccessToken = accessToken;
      const createdCategory = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
        createAdminExpenseCategory(currentAccessToken, { name: categoryName.trim(), isActive: true }),
      );
      setCategories((current) =>
        [...current, createdCategory].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setDraft((current) => ({ ...current, expenseCategoryId: createdCategory.id }));
      setCategoryName("");
      setFeedbackMessage(`Categoria creada: ${createdCategory.name}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo crear la categoria."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateExpense() {
    if (!accessToken) return;
    setIsSubmitting(true);
    setFeedbackMessage("");
    setErrorMessage("");

    try {
      const sessionAccessToken = accessToken;
      const amount = Number(draft.amount || 0);
      const [createdExpense, nextRange] = await withRefreshedToken(sessionAccessToken, refresh, async (currentAccessToken) => {
        const expense = await createAdminExpense(currentAccessToken, {
          expenseCategoryId: draft.expenseCategoryId || null,
          expenseDate: draft.expenseDate,
          description: draft.detail.trim(),
          amount,
          notes: draft.notes.trim() ? draft.notes.trim() : null,
        });
        const refreshed = await getAdminRangeFinanceSummary(currentAccessToken, from, to);
        return [expense, refreshed] as const;
      });
      setExpenses(nextRange.expenses);
      setRangeData(nextRange);
      setDraft({
        detail: "",
        amount: "0",
        expenseDate: from,
        expenseCategoryId: draft.expenseCategoryId,
        notes: "",
      });
      setFeedbackMessage(`Gasto registrado por ${formatCurrency(createdExpense.amount)}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo registrar el gasto."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        <span className="text-sm text-[var(--text-muted)]">Cargando resumen financiero...</span>
      </div>
    );
  }

  return (
    <main className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-4">
        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] sm:text-sm">Finanzas</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-2xl">
                Ingresos, gastos y balance.
              </h2>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                className={`inline-flex h-9 items-center justify-center rounded-2xl px-4 text-xs font-semibold transition sm:text-sm ${
                  activeFilter === filter
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                }`}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>

          {activeFilter === "custom" ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="block text-sm font-medium text-[var(--text)]">
                Desde
                <input
                  className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Hasta
                <input
                  className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                  type="date"
                  min={customFrom}
                  max={todayString()}
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 flex items-start gap-2 rounded-[1.2rem] bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {feedbackMessage ? (
            <div className="mt-4 flex items-start gap-2 rounded-[1.2rem] bg-[var(--success-bg)] px-4 py-3 text-sm font-medium text-[var(--success)]">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          ) : null}
        </article>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--success)]" />
              <p className="text-xs text-[var(--text-muted)]">Ingresos</p>
            </div>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--success)] sm:text-2xl">
              {formatCurrency(rangeData?.completedIncome ?? 0)}
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[var(--danger)]" />
              <p className="text-xs text-[var(--text-muted)]">Gastos</p>
            </div>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--danger)] sm:text-2xl">
              {formatCurrency(rangeData?.recordedExpenses ?? 0)}
            </p>
          </article>
          <article className="col-span-2 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:col-span-1 sm:p-5">
            <div className="flex items-center gap-2">
              <DollarSign
                className={`h-4 w-4 ${
                  rangeData?.balance != null && rangeData.balance >= 0
                    ? "text-[var(--success)]"
                    : "text-[var(--accent)]"
                }`}
              />
              <p className="text-xs text-[var(--text-muted)]">Balance</p>
            </div>
            <p
              className={`mt-2 text-xl font-semibold tracking-[-0.04em] sm:text-2xl ${
                rangeData?.balance != null && rangeData.balance >= 0
                  ? "text-[var(--text)]"
                  : "text-[var(--accent)]"
              }`}
            >
              {formatCurrency(rangeData?.balance ?? 0)}
            </p>
          </article>
        </section>

        {chartData.length > 1 ? (
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)] sm:text-sm">
              <Calendar className="h-4 w-4" />
              Ingresos vs Gastos diarios
            </p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--text-subtle)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-subtle)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "1rem",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [`${Math.abs(Number(value ?? 0)).toFixed(0)} CUP`, ""]}
                  />
                  <Bar dataKey="Ingresos" fill="var(--success)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Gastos" fill="var(--danger)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        ) : null}

        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)] sm:text-sm">
            <Receipt className="h-4 w-4" />
            Gastos en este periodo
          </p>
          <div className="mt-4 space-y-2">
            {expenses.length ? (
              expenses.map((expense) => (
                <article key={expense.id} className="rounded-[1.2rem] bg-[var(--surface-muted)] p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)] sm:text-xs">
                        {expense.expenseCategoryName ?? "Sin categoria"}
                      </p>
                      <p className="mt-1 truncate text-sm text-[var(--text)]">{expense.description}</p>
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--text-subtle)] sm:text-xs">
                        <Calendar className="h-3 w-3" />
                        <span className="inline-block h-1 w-1 rounded-full bg-[var(--text-subtle)]" />
                        {expense.expenseDate}
                      </p>
                      {expense.notes ? (
                        <p className="mt-1 text-xs text-[var(--text-subtle)]">{expense.notes}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--accent)] sm:text-sm">
                      -{formatCurrency(expense.amount)}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[1.2rem] bg-[var(--surface-muted)] py-8">
                <Receipt className="h-8 w-8 text-[var(--text-subtle)]" />
                <p className="text-sm text-[var(--text-muted)]">No hay gastos en este periodo.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4">
        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Plus className="h-4 w-4" />
            Registrar gasto
          </p>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-[var(--text)]">
              Categoria
              <select
                className="mt-2 h-11 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                value={draft.expenseCategoryId}
                onChange={(e) => setDraft((c) => ({ ...c, expenseCategoryId: e.target.value }))}
              >
                <option value="">Sin categoria</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--text)]">
              Detalle
              <input
                className="mt-2 h-11 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                value={draft.detail}
                onChange={(e) => setDraft((c) => ({ ...c, detail: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-[var(--text)]">
                Monto (CUP)
                <input
                  className="mt-2 h-11 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                  inputMode="numeric"
                  value={draft.amount}
                  onChange={(e) => setDraft((c) => ({ ...c, amount: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Fecha
                <input
                  className="mt-2 h-11 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                  type="date"
                  min={from}
                  max={to}
                  value={
                    draft.expenseDate < from || draft.expenseDate > to
                      ? from
                      : draft.expenseDate
                  }
                  onChange={(e) => setDraft((c) => ({ ...c, expenseDate: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-[var(--text)]">
              Notas
              <textarea
                className="mt-2 h-20 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
                value={draft.notes}
                onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
              />
            </label>
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--text-subtle)]"
              type="button"
              onClick={() => void handleCreateExpense()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Guardar gasto
                </>
              )}
            </button>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            <Tag className="h-4 w-4" />
            Nueva categoria
          </p>
          <div className="mt-4 space-y-4">
            <input
              className="h-11 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
              placeholder="Nombre de la categoria"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--secondary-btn)] px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn-hover)]"
              type="button"
              onClick={() => void handleCreateCategory()}
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4" />
              Guardar categoria
            </button>
          </div>
        </article>

        <article className="rounded-[1.5rem] bg-[var(--surface-inverse)] p-4 text-[var(--text-on-dark)] sm:rounded-[2rem] sm:p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-on-dark)]/85">Regla de negocio</p>
          <p className="mt-3 text-xs leading-6 text-[var(--text-subtle)] sm:text-sm">
            Una cita confirmada no cuenta como ingreso. Solo entra al balance al marcarse como completada.
          </p>
        </article>
      </section>
    </main>
  );
}
