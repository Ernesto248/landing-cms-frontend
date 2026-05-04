"use client";

import { format as dfFormat } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Loader2,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import {
  getAdminAppointments,
  getAdminMonthlyFinanceSummary,
  getAdminFinanceHistory,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import { getHavanaIsoDate, getHavanaMonthKey, getHavanaTime, toHavanaOffsetDateTime } from "@/lib/havana-time";
import type {
  AppointmentResponse,
  MonthlyFinanceSummaryResponse,
  FinanceHistoryResponse,
} from "@/lib/api/types";

type DashboardAppointment = {
  id: string;
  time: string;
  client: string;
  services: string;
  status: string;
  rawStatus: string;
};

type ChartView = "citas" | "dinero";

function formatCurrency(value: number) {
  return `${value.toFixed(0)} CUP`;
}

function getStatusLabel(status: string) {
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  return status;
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

const PIE_COLORS = ["var(--chart-income)", "var(--chart-expense)"];

export function AdminHomeDashboard() {
  const { accessToken, refresh, status } = useAdminSession();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [todayAppointments, setTodayAppointments] = useState<AppointmentResponse[]>([]);
  const [monthAppointments, setMonthAppointments] = useState<AppointmentResponse[]>([]);
  const [summary, setSummary] = useState<MonthlyFinanceSummaryResponse | null>(null);
  const [financeHistory, setFinanceHistory] = useState<FinanceHistoryResponse | null>(null);
  const [chartView, setChartView] = useState<ChartView>("citas");

  const todayIsoDate = useMemo(() => getHavanaIsoDate(), []);
  const monthKey = useMemo(() => getHavanaMonthKey(), []);

  const appointments = useMemo<DashboardAppointment[]>(
    () =>
      todayAppointments
        .map((appointment) => ({
          id: appointment.id,
          time: getHavanaTime(appointment.scheduledStart),
          client: appointment.clientName,
          services:
            appointment.items.map((item) => item.serviceNameSnapshot).join(" + ") || "Servicio sin definir",
          status: getStatusLabel(appointment.status),
          rawStatus: appointment.status,
        }))
        .sort((left, right) => left.time.localeCompare(right.time)),
    [todayAppointments],
  );

  const todayConfirmedCount = useMemo(
    () => todayAppointments.filter((a) => a.status === "CONFIRMED").length,
    [todayAppointments],
  );
  const todayCompletedCount = useMemo(
    () => todayAppointments.filter((a) => a.status === "COMPLETED").length,
    [todayAppointments],
  );
  const todayCancelledCount = useMemo(
    () => todayAppointments.filter((a) => a.status === "CANCELLED").length,
    [todayAppointments],
  );

  const monthConfirmedCount = useMemo(
    () => monthAppointments.filter((a) => a.status === "CONFIRMED").length,
    [monthAppointments],
  );
  const monthCompletedCount = useMemo(
    () => monthAppointments.filter((a) => a.status === "COMPLETED").length,
    [monthAppointments],
  );
  const monthCancelledCount = useMemo(
    () => monthAppointments.filter((a) => a.status === "CANCELLED").length,
    [monthAppointments],
  );

  const metrics = useMemo(
    () => [
      { label: "Ingresos del mes", value: formatCurrency(summary?.completedIncome ?? 0), icon: TrendingUp, color: "text-[var(--success)]" },
      { label: "Gastos del mes", value: formatCurrency(summary?.recordedExpenses ?? 0), icon: TrendingDown, color: "text-[var(--danger)]" },
      { label: "Balance", value: formatCurrency(summary?.balance ?? 0), icon: DollarSign, color: summary?.balance != null && summary.balance >= 0 ? "text-[var(--success)]" : "text-[var(--accent)]" },
      { label: "Citas hoy", value: String(todayAppointments.length), icon: CalendarDays, color: "text-[var(--text-muted)]" },
      { label: "Citas del mes", value: String(monthAppointments.length), icon: Users, color: "text-[var(--text-muted)]" },
    ],
    [monthAppointments.length, summary, todayAppointments.length],
  );

  const donutData = useMemo(
    () => [
      { name: "Ingresos", value: summary?.completedIncome ?? 0 },
      { name: "Gastos", value: summary?.recordedExpenses ?? 0 },
    ],
    [summary],
  );

  const totalMoneyTracked = useMemo(
    () => donutData.reduce((total, entry) => total + entry.value, 0),
    [donutData],
  );

  const donutBreakdown = useMemo(
    () =>
      donutData.map((entry, index) => ({
        ...entry,
        color: PIE_COLORS[index % PIE_COLORS.length],
        percentage: totalMoneyTracked > 0 ? Math.round((entry.value / totalMoneyTracked) * 100) : 0,
      })),
    [donutData, totalMoneyTracked],
  );

  const statusBarData = useMemo(
    () => [
      { name: "Confirmadas", shortName: "Conf.", confirmadas: monthConfirmedCount, completadas: 0, canceladas: 0 },
      { name: "Completadas", shortName: "Comp.", confirmadas: 0, completadas: monthCompletedCount, canceladas: 0 },
      { name: "Canceladas", shortName: "Canc.", confirmadas: 0, completadas: 0, canceladas: monthCancelledCount },
    ],
    [monthConfirmedCount, monthCompletedCount, monthCancelledCount],
  );

  const historyChartData = useMemo(
    () =>
      financeHistory?.months
        ? financeHistory.months.slice().reverse().map((m) => ({
            name: dfFormat(new Date(m.year, m.month - 1), "MMM"),
            Ingresos: m.income,
            Gastos: m.expenses,
          }))
        : [],
    [financeHistory],
  );

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;
    const monthStart = `${monthKey}-01`;
    const monthEnd = new Date(`${monthStart}T12:00:00Z`);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
    const monthEndIso = `${monthKey}-${String(monthEnd.getUTCDate()).padStart(2, "0")}`;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [nextToday, nextMonth, nextSummary, nextHistory] = await withRefreshedToken<
          [AppointmentResponse[], AppointmentResponse[], MonthlyFinanceSummaryResponse, FinanceHistoryResponse]
        >(sessionAccessToken, refresh, (currentAccessToken) =>
          Promise.all([
            getAdminAppointments(currentAccessToken, toHavanaOffsetDateTime(todayIsoDate, "00:00"), toHavanaOffsetDateTime(todayIsoDate, "23:59")),
            getAdminAppointments(currentAccessToken, toHavanaOffsetDateTime(monthStart, "00:00"), toHavanaOffsetDateTime(monthEndIso, "23:59")),
            getAdminMonthlyFinanceSummary(currentAccessToken, Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7))),
            getAdminFinanceHistory(currentAccessToken, 6).catch(() => null as unknown as FinanceHistoryResponse),
          ]),
        );
        if (!isMounted) return;
        setTodayAppointments(nextToday);
        setMonthAppointments(nextMonth);
        setSummary(nextSummary);
        setFinanceHistory(nextHistory);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "No se pudo cargar el resumen admin."));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadDashboard();
    return () => { isMounted = false; };
  }, [accessToken, monthKey, refresh, status, todayIsoDate]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        <span className="text-sm text-[var(--text-muted)]">Cargando resumen del admin...</span>
      </div>
    );
  }

  return (
    <main className="min-w-0 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="min-w-0 space-y-4">
        <article className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] sm:rounded-[2rem]">
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
          </div>
        </article>

        <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] sm:text-sm">Agenda de hoy</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-2xl">Lo primero es resolver el dia.</h2>
            </div>
            <Link
              href="/admin/citas"
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--secondary-btn)] px-4 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn-hover)] sm:h-11 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva cita</span>
              <span className="sm:hidden">Cita</span>
            </Link>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-[1.2rem] bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{errorMessage}</p>
          ) : null}

          <div className="mt-4 space-y-2">
            {appointments.length ? (
              appointments.map((appointment) => (
                <article key={appointment.id} className="rounded-[1.2rem] bg-[var(--surface-muted)] p-3.5 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 flex-col items-center rounded-xl bg-[var(--surface)] px-2.5 py-1.5">
                      <span className="text-base font-bold tabular-nums text-[var(--accent)] sm:text-lg">{appointment.time}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">{appointment.client}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{appointment.services}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {appointment.status}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[1.2rem] bg-[var(--surface-muted)] py-8">
                <CalendarDays className="h-8 w-8 text-[var(--text-subtle)]" />
                <p className="text-sm text-[var(--text-muted)]">No hay citas para hoy.</p>
              </div>
            )}
          </div>
        </article>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                  <p className="text-xs text-[var(--text-muted)]">{metric.label}</p>
                </div>
                <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-2xl">{metric.value}</p>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-5">
            <p className="text-xs font-medium text-[var(--text-muted)]">Estados de hoy</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Confirmadas
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">{todayConfirmedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Completadas
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">{todayCompletedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Canceladas
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">{todayCancelledCount}</span>
              </div>
            </div>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-5">
            <p className="text-xs font-medium text-[var(--text-muted)]">Estados del mes</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Confirmadas
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">{monthConfirmedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Completadas
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">{monthCompletedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Canceladas
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">{monthCancelledCount}</span>
              </div>
            </div>
          </article>
        </section>
      </section>

      <section className="min-w-0 grid gap-4">
        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Graficos</p>
            <div className="inline-flex w-full rounded-2xl bg-[var(--surface-muted)] p-1 text-xs font-semibold sm:w-auto">
              <button
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 transition sm:flex-none ${
                  chartView === "citas" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                type="button"
                onClick={() => setChartView("citas")}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Citas
              </button>
              <button
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 transition sm:flex-none ${
                  chartView === "dinero" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                type="button"
                onClick={() => setChartView("dinero")}
              >
                <DollarSign className="h-3.5 w-3.5" />
                Dinero
              </button>
            </div>
          </div>

          {chartView === "citas" ? (
            <div>
              <div className="mt-3 h-52 min-w-0 w-full overflow-hidden sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statusBarData}>
                    <XAxis dataKey="shortName" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                    <Line type="monotone" dataKey="confirmadas" stroke="var(--chart-confirmed)" strokeWidth={2} dot={{ fill: "var(--chart-confirmed)", r: 4 }} />
                    <Line type="monotone" dataKey="completadas" stroke="var(--chart-completed)" strokeWidth={2} dot={{ fill: "var(--chart-completed)", r: 4 }} />
                    <Line type="monotone" dataKey="canceladas" stroke="var(--chart-cancelled)" strokeWidth={2} dot={{ fill: "var(--chart-cancelled)", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-[var(--text-subtle)]">Citas del mes por estado</p>
            </div>
          ) : (
            <div>
              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
                <div className="h-52 min-w-0 w-full overflow-hidden sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {donutBreakdown.map((entry) => (
                    <div
                      key={entry.name}
                      className="rounded-[1.2rem] bg-[var(--surface-muted)] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          {entry.name}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                          {entry.percentage}%
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">
                        {formatCurrency(entry.value)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {totalMoneyTracked > 0 ? `${entry.percentage}% del movimiento del mes` : "Sin movimiento registrado este mes"}
                      </p>
                    </div>
                  ))}

                  <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:col-span-2 lg:col-span-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                      Balance neto
                    </p>
                    <p className={`mt-2 text-xl font-semibold tracking-[-0.04em] ${summary?.balance != null && summary.balance >= 0 ? "text-[var(--success)]" : "text-[var(--accent)]"}`}>
                      {formatCurrency(summary?.balance ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Ingresos completados menos gastos registrados en el mes actual.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {chartView === "dinero" && historyChartData.length > 0 ? (
            <div className="mt-4">
              <div className="h-40 min-w-0 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Line type="monotone" dataKey="Ingresos" stroke="var(--chart-income)" strokeWidth={2} dot={{ fill: "var(--chart-income)", r: 3 }} />
                    <Line type="monotone" dataKey="Gastos" stroke="var(--chart-expense)" strokeWidth={2} dot={{ fill: "var(--chart-expense)", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-[var(--text-subtle)]">Ultimos {historyChartData.length} meses</p>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
