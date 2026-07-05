"use client";

import {
  addDays as dfAddDays,
  addMonths as dfAddMonths,
  endOfMonth as dfEndOfMonth,
  format as dfFormat,
  getDay,
  parseISO,
  startOfMonth as dfStartOfMonth,
  startOfWeek as dfStartOfWeek,
} from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarX,
  Check,
  CircleDashed,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Scissors,
  Search,
  Users,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdminMobileSheet } from "@/components/admin/admin-mobile-sheet";
import { AppointmentDetailPanel } from "@/components/admin/appointment-detail-panel";
import {
  getAppointmentStatusLabel,
  getStatusColor,
  type AppointmentMode,
  type PlannerAppointment,
} from "@/components/admin/appointment-utils";
import { useAdminSession } from "@/components/admin/admin-session-provider";
import {
  createAdminAppointment,
  createAdminClient,
  deleteAdminAppointment,
  getAdminAppointments,
  getAdminClients,
  getAdminServices,
  updateAdminAppointment,
  updateAdminAppointmentStatus,
  updateAdminClient,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type {
  AppointmentResponse,
  ClientResponse,
  ServiceResponse,
} from "@/lib/api/types";
import {
  getHavanaDateTimeParts,
  getHavanaIsoDate,
  toHavanaOffsetDateTime,
} from "@/lib/havana-time";
import { formatDuration, formatPrice } from "@/lib/site-content";

const wizardSteps = ["Cliente", "Servicios", "Horario", "Modalidad", "Resumen"];
const dayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type AppointmentForm = {
  existingClientId: string;
  clientName: string;
  clientPhone: string;
  selectedServiceIds: string[];
  touchUpByServiceId: Record<string, boolean>;
  date: string;
  time: string;
  mode: AppointmentMode;
  travelFee: string;
  addressSnapshot: string;
  notes: string;
};

type WeekDay = {
  label: string;
  date: string;
  isoDate: string;
};

type MobilePanel = "wizard" | "detail" | null;
type CalendarView = "day" | "week" | "month";

type WizardPanelProps = {
  editingAppointmentId: string | null;
  currentStep: number;
  onClose: () => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onSave: () => void;
  isSubmitting: boolean;
  canSaveAppointment: boolean;
  canContinueStep: boolean;
  validationMessage: string;
  clients: ClientResponse[];
  form: AppointmentForm;
  onExistingClientChange: (clientId: string) => void;
  onFormChange: (updater: (current: AppointmentForm) => AppointmentForm) => void;
  servicesByCategory: Record<string, ServiceResponse[]>;
  toggleService: (serviceId: string) => void;
  toggleTouchUp: (serviceId: string) => void;
  selectedServices: ServiceResponse[];
  durationTotal: number;
  endTimeLabel: string;
  overlappingAppointment: PlannerAppointment | undefined;
  isLoadingValidationAppointments: boolean;
  travelFee: number;
  estimatedTotal: number;
  onStepClick: (stepIndex: number) => void;
  furthestStepReached: number;
};

function getTodayIsoDate() {
  return getHavanaIsoDate();
}

function createInitialForm(date: string): AppointmentForm {
  return {
    existingClientId: "",
    clientName: "",
    clientPhone: "",
    selectedServiceIds: [],
    touchUpByServiceId: {},
    date,
    time: "10:30",
    mode: "STUDIO",
    travelFee: "0",
    addressSnapshot: "",
    notes: "",
  };
}

function parseIsoDate(isoDate: string) {
  return parseISO(`${isoDate}T12:00:00`);
}

function addDays(isoDate: string, amount: number) {
  return dfFormat(dfAddDays(parseIsoDate(isoDate), amount), "yyyy-MM-dd");
}

function addMonths(isoDate: string, amount: number) {
  return dfFormat(dfAddMonths(parseIsoDate(isoDate), amount), "yyyy-MM-dd");
}

function startOfWeek(isoDate: string) {
  const monday = dfStartOfWeek(parseIsoDate(isoDate), { weekStartsOn: 1 });
  return dfFormat(monday, "yyyy-MM-dd");
}

function formatDayTitle(isoDate: string) {
  const date = parseIsoDate(isoDate);
  return `${dayLabels[getDay(date)]} ${dfFormat(date, "d")} ${monthLabels[date.getMonth()]}`;
}

function formatWeekRangeLabel(anchorDate: string) {
  const monday = parseIsoDate(startOfWeek(anchorDate));
  const sunday = parseIsoDate(addDays(dfFormat(monday, "yyyy-MM-dd"), 6));
  const startMonth = monthLabels[monday.getMonth()];
  const endMonth = monthLabels[sunday.getMonth()];

  if (monday.getMonth() === sunday.getMonth()) {
    return `${dfFormat(monday, "d")} - ${dfFormat(sunday, "d")} ${endMonth}`;
  }

  return `${dfFormat(monday, "d")} ${startMonth} - ${dfFormat(sunday, "d")} ${endMonth}`;
}

function formatMonthLabel(anchorDate: string) {
  const date = parseIsoDate(anchorDate);
  return `${monthLabels[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDisplayDate(isoDate: string) {
  return dfFormat(parseIsoDate(isoDate), "dd/MM/yyyy");
}

function normalizeDisplayDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeMilitaryTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidMilitaryTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(time: string) {
  if (!isValidMilitaryTime(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeLabel(totalMinutes: number) {
  const minutesInDay = 24 * 60;
  const normalizedMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  return `${String(Math.floor(normalizedMinutes / 60)).padStart(2, "0")}:${String(normalizedMinutes % 60).padStart(2, "0")}`;
}

function getCalendarRange(view: CalendarView, anchorDate: string) {
  if (view === "day") {
    return { from: anchorDate, to: anchorDate };
  }

  if (view === "month") {
    const date = parseIsoDate(anchorDate);
    return {
      from: dfFormat(dfStartOfMonth(date), "yyyy-MM-dd"),
      to: dfFormat(dfEndOfMonth(date), "yyyy-MM-dd"),
    };
  }

  const week = buildWeekDays(anchorDate);
  return { from: week[0].isoDate, to: week[week.length - 1].isoDate };
}

function buildWeekDays(anchorDate: string): WeekDay[] {
  const monday = startOfWeek(anchorDate);

  return Array.from({ length: 7 }, (_, index) => {
    const isoDate = addDays(monday, index);
    const date = parseIsoDate(isoDate);

    return {
      label: dayLabels[getDay(date)] ?? "Dia",
      date: dfFormat(date, "dd"),
      isoDate,
    };
  });
}

function buildMonthDays(anchorDate: string): WeekDay[] {
  const date = parseIsoDate(anchorDate);
  const firstDay = dfStartOfMonth(date);
  const lastDay = dfEndOfMonth(date);
  const dayCount = Number(dfFormat(lastDay, "d"));

  return Array.from({ length: dayCount }, (_, index) => {
    const current = dfAddDays(firstDay, index);
    return {
      label: dayLabels[getDay(current)] ?? "Dia",
      date: dfFormat(current, "dd"),
      isoDate: dfFormat(current, "yyyy-MM-dd"),
    };
  });
}

function normalizeNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getAppointmentEndTimeMinutes(startTime: string, durationMinutes: number) {
  const startMinutes = timeToMinutes(startTime);
  return startMinutes === null ? null : startMinutes + durationMinutes;
}

function hasAppointmentOverlap(
  candidate: {
    id?: string | null;
    date: string;
    time: string;
    durationMinutes: number;
  },
  appointments: PlannerAppointment[],
) {
  const candidateStart = getAppointmentEndTimeMinutes(candidate.time, 0);
  const candidateEnd = getAppointmentEndTimeMinutes(candidate.time, candidate.durationMinutes);
  if (candidateStart === null || candidateEnd === null) return undefined;

  return appointments.find((appointment) => {
    if (candidate.id && appointment.id === candidate.id) return false;
    if (appointment.date !== candidate.date || appointment.status === "CANCELLED") return false;

    const appointmentStart = getAppointmentEndTimeMinutes(appointment.time, 0);
    const appointmentEnd = getAppointmentEndTimeMinutes(appointment.time, appointment.durationMinutes);
    if (appointmentStart === null || appointmentEnd === null) return false;
    return candidateStart < appointmentEnd && candidateEnd > appointmentStart;
  });
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    const message = error.message;
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("outside business hours")) {
      return "La cita esta fuera del horario laboral configurado. Ajusta la fecha u hora en el paso Horario.";
    }

    if (normalizedMessage.includes("overlaps with a schedule block")) {
      return "La cita cruza con un bloqueo de horario. Ajusta la fecha u hora en el paso Horario.";
    }

    if (normalizedMessage.includes("overlap")) {
      return "La cita se cruza con otra cita existente. Ajusta la fecha u hora en el paso Horario.";
    }

    return message;
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
      if (nextAccessToken) return operation(nextAccessToken);
    }
    throw error;
  }
}

function mapAppointment(
  appointment: AppointmentResponse,
  clientsById: Map<string, ClientResponse>,
): PlannerAppointment {
  const client = clientsById.get(appointment.clientId);
  const scheduledStart = getHavanaDateTimeParts(appointment.scheduledStart);

  return {
    id: appointment.id,
    clientId: appointment.clientId,
    client: appointment.clientName,
    clientPhone: client?.whatsapp ?? client?.phone ?? "",
    date: scheduledStart.date,
    time: scheduledStart.time,
    servicesSummary:
      appointment.items.map((item) => item.serviceNameSnapshot).join(" + ") || "Servicio sin definir",
    status: appointment.status,
    statusLabel: getAppointmentStatusLabel(appointment.status),
    mode: appointment.appointmentMode === "HOME" ? "HOME" : "STUDIO",
    addressSnapshot: appointment.addressSnapshot,
    notes: appointment.notes,
    travelFee: appointment.travelFee,
    totalAmount: appointment.totalAmount,
    durationMinutes: appointment.items.reduce((sum, item) => sum + item.durationSnapshotMinutes, 0),
    cancelReason: appointment.cancelReason,
    items: appointment.items,
  };
}

type LoadingStateProps = { message: string };

function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-3 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
      <span className="text-sm text-[var(--text-muted)]">{message}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof CalendarX;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-10 text-center">
      <Icon className="h-10 w-10 text-[var(--text-subtle)]" />
      <p className="text-sm leading-6 text-[var(--text-muted)]">{title}</p>
      {action ? (
        <button
          className="mt-1 inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          type="button"
          onClick={action.onClick}
        >
          <Plus className="h-4 w-4" />
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

function AppointmentWizardPanel({
  editingAppointmentId,
  currentStep,
  onClose,
  onPreviousStep,
  onNextStep,
  onSave,
  isSubmitting,
  canSaveAppointment,
  canContinueStep,
  validationMessage,
  clients,
  form,
  onExistingClientChange,
  onFormChange,
  servicesByCategory,
  toggleService,
  toggleTouchUp,
  selectedServices,
  durationTotal,
  endTimeLabel,
  overlappingAppointment,
  isLoadingValidationAppointments,
  travelFee,
  estimatedTotal,
  onStepClick,
  furthestStepReached,
}: WizardPanelProps) {
  const [clientSearch, setClientSearch] = useState("");
  const [dateInput, setDateInput] = useState(() => ({
    formDate: form.date,
    value: formatDisplayDate(form.date),
  }));
  const nativeDateInputRef = useRef<HTMLInputElement>(null);
  const nativeTimeInputRef = useRef<HTMLInputElement>(null);
  const selectedClient = clients.find((client) => client.id === form.existingClientId);
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 8);

    return clients
      .filter((client) => {
        const phone = client.whatsapp ?? client.phone ?? "";
        return `${client.fullName} ${phone}`.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [clientSearch, clients]);
  const dateInputValue = dateInput.formDate === form.date ? dateInput.value : formatDisplayDate(form.date);
  const openNativePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // Some mobile browsers only allow the native picker from the direct input tap.
    }
    input.focus();
    if (document.activeElement !== input) {
      input.click();
      return;
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] max-h-[calc(100vh-8rem)] sm:rounded-[2rem]">
      <div className="shrink-0 p-4 pb-0 sm:p-5 sm:pb-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {editingAppointmentId ? "Editar cita" : "Nueva cita"}
          </p>
          <button
            aria-label="Cerrar formulario"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1">
          {wizardSteps.map((step, index) => {
            const reached = index <= furthestStepReached;
            const active = index <= currentStep;
            return (
              <button
                key={step}
                className={`flex-1 ${reached ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
                type="button"
                onClick={() => onStepClick(index)}
                disabled={!reached}
              >
                <div className="flex items-center gap-1">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      active ? "bg-[var(--accent)]" : "bg-[var(--secondary-btn)]"
                    }`}
                  />
                  {index < wizardSteps.length - 1 ? (
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        index < currentStep ? "bg-[var(--accent)]" : "bg-[var(--secondary-btn)]"
                      }`}
                    />
                  ) : null}
                </div>
                <p
                  className={`mt-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    active ? "text-[var(--accent)]" : "text-[var(--text-subtle)]"
                  }`}
                >
                  {step.slice(0, 4)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-5 sm:p-5 sm:pt-5">
        {currentStep === 0 ? (
          <div className="space-y-4">
            <div className="block text-sm font-medium text-[var(--text)]">
              Clienta existente
              <div className="mt-2 rounded-[1.4rem] border border-[var(--border-input)] bg-[var(--surface)] p-2">
                <label className="flex h-10 items-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-3">
                  <Search className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-subtle)]"
                    value={clientSearch || selectedClient?.fullName || ""}
                    onChange={(event) => {
                      setClientSearch(event.target.value);
                      if (form.existingClientId) {
                        onExistingClientChange("");
                      }
                    }}
                    placeholder="Buscar por nombre o telefono"
                  />
                </label>

                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                  <button
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                      !form.existingClientId
                        ? "bg-[var(--accent)] font-semibold text-white"
                        : "text-[var(--text)] hover:bg-[var(--surface-muted)]"
                    }`}
                    type="button"
                    onClick={() => {
                      setClientSearch("");
                      onExistingClientChange("");
                    }}
                  >
                    Registrar clienta nueva
                  </button>
                  {filteredClients.map((client) => {
                    const selected = client.id === form.existingClientId;
                    const phone = client.whatsapp ?? client.phone;
                    return (
                      <button
                        key={client.id}
                        className={`block w-full rounded-2xl px-3 py-2.5 text-left transition ${
                          selected
                            ? "bg-[var(--danger-bg)] text-[var(--accent)]"
                            : "text-[var(--text)] hover:bg-[var(--surface-muted)]"
                        }`}
                        type="button"
                        onClick={() => {
                          setClientSearch("");
                          onExistingClientChange(client.id);
                        }}
                      >
                        <span className="block truncate text-sm font-semibold">{client.fullName}</span>
                        {phone ? (
                          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{phone}</span>
                        ) : null}
                      </button>
                    );
                  })}
                  {filteredClients.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[var(--text-muted)]">No encontramos clientas con esa busqueda.</p>
                  ) : null}
                </div>
              </div>
            </div>
            <label className="block text-sm font-medium text-[var(--text)]">
              Nombre
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                value={form.clientName}
                onChange={(event) => onFormChange((current) => ({ ...current, clientName: event.target.value }))}
                placeholder="Nombre completo"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text)]">
              WhatsApp
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                value={form.clientPhone}
                onChange={(event) => onFormChange((current) => ({ ...current, clientPhone: event.target.value }))}
                placeholder="+53 5XXXXXXX"
              />
            </label>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-4">
            {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
              <div key={category}>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                  <Scissors className="h-3.5 w-3.5" />
                  {category}
                </p>
                <div className="mt-2 space-y-2">
                  {categoryServices.map((service) => {
                    const selected = form.selectedServiceIds.includes(service.id);
                    const touchUpSelected = Boolean(form.touchUpByServiceId[service.id]);
                    const finalPrice = service.basePrice - (touchUpSelected ? service.touchUpDiscount : 0);

                    return (
                      <div
                        key={service.id}
                        className={`rounded-[1.2rem] border px-4 py-3.5 transition ${
                          selected
                            ? "border-[var(--accent)] bg-[var(--danger-bg)]"
                            : "border-[rgba(145,145,140,0.15)] bg-[var(--surface-muted)] hover:border-[var(--border-input)]"
                        }`}
                      >
                        <button className="block w-full text-left" type="button" onClick={() => toggleService(service.id)}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${selected ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>
                                {service.name}
                              </p>
                              <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                                {formatDuration(service.durationMinutes)} · {formatPrice(finalPrice)}
                              </p>
                            </div>
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                selected
                                  ? "border-[var(--accent)] bg-[var(--accent)]"
                                  : "border-[var(--border-input)] bg-[var(--surface)]"
                              }`}
                            >
                              {selected ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                            </div>
                          </div>
                        </button>
                        {selected && service.supportsTouchUp ? (
                          <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-medium transition hover:bg-[var(--surface-muted)]">
                            <input
                              checked={touchUpSelected}
                              type="checkbox"
                              className="h-4 w-4 rounded accent-[var(--accent)]"
                              onChange={() => toggleTouchUp(service.id)}
                            />
                            <span className="text-[var(--text)]">Retoque</span>
                            <span className="ml-auto font-semibold text-[var(--accent)]">
                              -{formatPrice(service.touchUpDiscount)}
                            </span>
                          </label>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[var(--text)]">
              Fecha
              <div className="mt-2 flex h-12 overflow-hidden rounded-2xl border border-[var(--border-input)] bg-[var(--surface)]">
                <input
                  className="min-w-0 flex-1 bg-transparent px-4 text-base outline-none sm:text-sm"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="DD/MM/YYYY"
                  value={dateInputValue}
                  onBlur={() => {
                    const nextDate = parseDisplayDate(dateInputValue);
                    const fallbackDate = nextDate ?? form.date;
                    setDateInput({ formDate: fallbackDate, value: formatDisplayDate(fallbackDate) });
                  }}
                  onChange={(event) => {
                    const nextValue = normalizeDisplayDateInput(event.target.value);
                    const nextDate = parseDisplayDate(nextValue);
                    setDateInput({ formDate: nextDate ?? form.date, value: nextValue });
                    if (nextDate) {
                      onFormChange((current) => ({ ...current, date: nextDate }));
                    }
                  }}
                />
                <span className="relative flex w-12 shrink-0 items-center justify-center border-l border-[var(--secondary-btn)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]">
                  <CalendarDays className="pointer-events-none h-4 w-4" />
                  <input
                    ref={nativeDateInputRef}
                    aria-label="Abrir calendario"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    type="date"
                    value={form.date}
                    onClick={(event) => openNativePicker(event.currentTarget)}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setDateInput({ formDate: event.target.value, value: formatDisplayDate(event.target.value) });
                      onFormChange((current) => ({ ...current, date: event.target.value }));
                    }}
                  />
                </span>
              </div>
              <span className="mt-1 block text-xs font-medium text-[var(--text-muted)]">Formato DD/MM/YYYY</span>
            </label>
            <label className="block text-sm font-medium text-[var(--text)]">
              Hora de inicio
              <div className="mt-2 flex h-12 overflow-hidden rounded-2xl border border-[var(--border-input)] bg-[var(--surface)]">
                <input
                  className="min-w-0 flex-1 bg-transparent px-4 text-base outline-none sm:text-sm"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="14:30"
                  value={form.time}
                  onChange={(event) => {
                    const nextTime = normalizeMilitaryTimeInput(event.target.value);
                    onFormChange((current) => ({ ...current, time: nextTime }));
                  }}
                />
                <span className="relative flex w-12 shrink-0 items-center justify-center border-l border-[var(--secondary-btn)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]">
                  <Clock className="pointer-events-none h-4 w-4" />
                  <input
                    ref={nativeTimeInputRef}
                    aria-label="Abrir selector de hora"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    type="time"
                    value={isValidMilitaryTime(form.time) ? form.time : ""}
                    onClick={(event) => openNativePicker(event.currentTarget)}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      onFormChange((current) => ({ ...current, time: event.target.value }));
                    }}
                  />
                </span>
              </div>
              <span
                className={`mt-1 block text-xs font-medium ${
                  form.time && !isValidMilitaryTime(form.time) ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
                }`}
              >
                Formato 24 horas, ej. 09:30 o 14:30.
              </span>
            </label>
            <div className="rounded-[1.2rem] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[var(--text-subtle)]" />
                  <span className="text-[var(--text-muted)]">{formatDuration(durationTotal)}</span>
                </div>
                <span className="text-[var(--text-subtle)]">|</span>
                <span className="text-[var(--text-muted)]">
                  {form.time} - {endTimeLabel}
                </span>
              </div>
              {overlappingAppointment ? (
                <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-[var(--danger-bg)] p-2.5 text-xs font-medium text-[var(--danger)]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Solapa con {overlappingAppointment.client} a las {overlappingAppointment.time}.
                  </span>
                </div>
              ) : isLoadingValidationAppointments ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Validando horario...
                </div>
              ) : durationTotal > 0 ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
                  <Check className="h-3.5 w-3.5" />
                  Sin conflictos.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["STUDIO", "HOME"] as AppointmentMode[]).map((mode) => {
                const selected = form.mode === mode;
                return (
                  <button
                    key={mode}
                    className={`flex flex-col items-center gap-1.5 rounded-[1.2rem] px-4 py-5 text-sm font-semibold transition ${
                      selected
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                    }`}
                    type="button"
                    onClick={() => onFormChange((current) => ({ ...current, mode }))}
                  >
                    <MapPin className="h-5 w-5" />
                    {mode === "STUDIO" ? "Estudio" : "A domicilio"}
                  </button>
                );
              })}
            </div>
            {form.mode === "HOME" ? (
              <>
                <label className="block text-sm font-medium text-[var(--text)]">
                  Fee de traslado (CUP)
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                    inputMode="numeric"
                    value={form.travelFee}
                    onChange={(event) => onFormChange((current) => ({ ...current, travelFee: event.target.value }))}
                  />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">
                  Direccion
                  <textarea
                    className="mt-2 h-20 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
                    value={form.addressSnapshot}
                    onChange={(event) => onFormChange((current) => ({ ...current, addressSnapshot: event.target.value }))}
                  />
                </label>
              </>
            ) : null}
            <label className="block text-sm font-medium text-[var(--text)]">
              Notas
              <textarea
                className="mt-2 h-20 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
                value={form.notes}
                onChange={(event) => onFormChange((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
          </div>
        ) : null}

        {currentStep === 4 ? (
          <div className="rounded-[1.2rem] bg-[var(--surface-muted)] p-4">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--text-subtle)]" />
                <span className="font-semibold text-[var(--text)]">{form.clientName || "Sin definir"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-[var(--text-subtle)]" />
                <span className="text-[var(--text)]">
                  {selectedServices.length ? selectedServices.map((service) => service.name).join(", ") : "Sin seleccionar"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--text-subtle)]" />
                <span className="text-[var(--text)]">
                  {formatDisplayDate(form.date)} · {form.time} - {endTimeLabel} · {formatDuration(durationTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--text-subtle)]" />
                <span className="text-[var(--text)]">{form.mode === "STUDIO" ? "Estudio" : "A domicilio"}</span>
                {form.mode === "HOME" ? (
                  <span className="ml-auto shrink-0 font-semibold text-[var(--accent)]">{formatPrice(travelFee)}</span>
                ) : null}
              </div>
              <div className="mt-1 border-t border-[var(--secondary-btn)] pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Total</span>
                  <span className="text-lg font-bold text-[var(--text)]">{formatPrice(estimatedTotal)}</span>
                </div>
              </div>
              {form.notes ? <p className="mt-1 text-xs text-[var(--text-muted)]">Nota: {form.notes}</p> : null}
              {overlappingAppointment ? (
                <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-[var(--danger-bg)] p-2.5 text-xs font-medium text-[var(--danger)]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Conflicto: se cruza con {overlappingAppointment.client} a las {overlappingAppointment.time}.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[var(--secondary-btn)] p-4 sm:p-5">
        {validationMessage ? (
          <div className="mb-3 flex items-start gap-2 rounded-[1rem] bg-[var(--danger-bg)] px-3 py-2.5 text-xs font-medium text-[var(--danger)]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{validationMessage}</span>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--secondary-btn)] px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn-hover)] disabled:opacity-30 sm:h-11"
          type="button"
          onClick={onPreviousStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        {currentStep < wizardSteps.length - 1 ? (
          <button
            aria-disabled={!canContinueStep}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition sm:h-11 ${
              canContinueStep ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)]" : "bg-[var(--text-subtle)]"
            }`}
            type="button"
            onClick={onNextStep}
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition sm:h-11 ${
              canSaveAppointment ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)]" : "cursor-not-allowed bg-[var(--text-subtle)]"
            }`}
            type="button"
            onClick={onSave}
            disabled={!canSaveAppointment}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : !canSaveAppointment ? (
              "Completa los datos"
            ) : editingAppointmentId ? (
              <>
                <Pencil className="h-4 w-4" />
                Guardar cambios
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Guardar cita
              </>
            )}
          </button>
        )}
        </div>
      </div>
    </article>
  );
}

export function AppointmentsPlanner() {
  const searchParams = useSearchParams();
  const { accessToken, refresh, status } = useAdminSession();
  const requestedDate = searchParams.get("date");
  const requestedAppointmentId = searchParams.get("appointmentId");
  const requestedMode = searchParams.get("mode");
  const datePickerRef = useRef<HTMLInputElement>(null);
  const handledDeepLinkRef = useRef(false);
  const todayIsoDate = useMemo(() => getTodayIsoDate(), []);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [view, setView] = useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = useState(() => requestedDate ?? getTodayIsoDate());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(() => requestedAppointmentId);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStepReached, setFurthestStepReached] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [wizardValidationMessage, setWizardValidationMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isLoadingValidationAppointments, setIsLoadingValidationAppointments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [validationAppointments, setValidationAppointments] = useState<AppointmentResponse[]>([]);
  const [form, setForm] = useState<AppointmentForm>(() => createInitialForm(getTodayIsoDate()));

  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => buildMonthDays(selectedDate), [selectedDate]);
  const availableServices = useMemo(
    () => services.filter((service) => service.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [services],
  );
  const servicesByCategory = useMemo(
    () =>
      availableServices.reduce<Record<string, ServiceResponse[]>>((acc, service) => {
        if (!acc[service.category]) acc[service.category] = [];
        acc[service.category].push(service);
        return acc;
      }, {}),
    [availableServices],
  );
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const plannerAppointments = useMemo(
    () =>
      appointments
        .map((appointment) => mapAppointment(appointment, clientsById))
        .sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`)),
    [appointments, clientsById],
  );
  const validationPlannerAppointments = useMemo(
    () =>
      validationAppointments
        .map((appointment) => mapAppointment(appointment, clientsById))
        .sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`)),
    [clientsById, validationAppointments],
  );
  const selectedDayAppointments = useMemo(
    () => plannerAppointments.filter((appointment) => appointment.date === selectedDate),
    [plannerAppointments, selectedDate],
  );
  const selectedAppointment = useMemo(() => {
    if (!selectedDayAppointments.length) return null;
    if (!selectedAppointmentId) return selectedDayAppointments[0];

    return (
      selectedDayAppointments.find((appointment) => appointment.id === selectedAppointmentId) ??
      selectedDayAppointments[0]
    );
  }, [selectedAppointmentId, selectedDayAppointments]);
  const selectedServices = useMemo(
    () =>
      form.selectedServiceIds
        .map((serviceId) => availableServices.find((service) => service.id === serviceId))
        .filter((service): service is ServiceResponse => Boolean(service)),
    [availableServices, form.selectedServiceIds],
  );
  const serviceTotal = selectedServices.reduce((sum, service) => {
    const discount = form.touchUpByServiceId[service.id] ? service.touchUpDiscount : 0;
    return sum + service.basePrice - discount;
  }, 0);
  const durationTotal = selectedServices.reduce((sum, service) => sum + service.durationMinutes, 0);
  const travelFee = form.mode === "HOME" ? parseAmount(form.travelFee) : 0;
  const estimatedTotal = serviceTotal + travelFee;
  const overlappingAppointment = hasAppointmentOverlap(
    { id: editingAppointmentId, date: form.date, time: form.time, durationMinutes: durationTotal },
    validationPlannerAppointments,
  );
  const hasValidTime = isValidMilitaryTime(form.time);
  const hasClientForStep = Boolean(form.existingClientId || form.clientName.trim());
  const hasServiceForStep = selectedServices.length > 0;
  const endTimeMinutes = getAppointmentEndTimeMinutes(form.time, durationTotal);
  const canContinueStep =
    currentStep === 0
      ? hasClientForStep
      : currentStep === 1
        ? hasServiceForStep
        : currentStep === 2
          ? hasValidTime
          : true;
  const canSaveAppointment =
    hasClientForStep &&
    hasServiceForStep &&
    durationTotal > 0 &&
    hasValidTime &&
    !overlappingAppointment &&
    !isLoadingValidationAppointments &&
    !isSubmitting;
  const endTimeLabel = durationTotal && endTimeMinutes !== null ? minutesToTimeLabel(endTimeMinutes) : "--:--";
  const visibleCalendarDays =
    view === "day" ? weekDays.filter((day) => day.isoDate === selectedDate) : view === "month" ? monthDays : weekDays;
  const dateNavigationLabel =
    view === "day"
      ? formatDayTitle(selectedDate)
      : view === "month"
        ? formatMonthLabel(selectedDate)
        : formatWeekRangeLabel(selectedDate);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsMobileViewport(event ? event.matches : mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  async function loadAppointmentsForCalendarView(
    sessionAccessToken: string,
    anchorDate: string,
    calendarView: CalendarView,
  ) {
    const range = getCalendarRange(calendarView, anchorDate);
    return getAdminAppointments(
      sessionAccessToken,
      toHavanaOffsetDateTime(range.from, "00:00"),
      toHavanaOffsetDateTime(range.to, "23:59"),
    );
  }

  async function loadAppointmentsForDate(sessionAccessToken: string, date: string) {
    return getAdminAppointments(
      sessionAccessToken,
      toHavanaOffsetDateTime(date, "00:00"),
      toHavanaOffsetDateTime(date, "23:59"),
    );
  }

  async function reloadAppointmentData(sessionAccessToken: string, anchorDate: string, validationDate: string) {
    const [nextCalendarAppointments, nextValidationAppointments] = await Promise.all([
      loadAppointmentsForCalendarView(sessionAccessToken, anchorDate, view),
      loadAppointmentsForDate(sessionAccessToken, validationDate),
    ]);
    setAppointments(nextCalendarAppointments);
    setValidationAppointments(nextValidationAppointments);
  }

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadReferenceData() {
      setIsLoadingReferenceData(true);
      setErrorMessage("");
      try {
        const [nextClients, nextServices] = await withRefreshedToken<[ClientResponse[], ServiceResponse[]]>(
          sessionAccessToken,
          refresh,
          (currentAccessToken) =>
            Promise.all([getAdminClients(currentAccessToken), getAdminServices(currentAccessToken)]),
        );
        if (!isMounted) return;
        setClients(nextClients);
        setServices(nextServices);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "No se pudieron cargar clientes y servicios."));
      } finally {
        if (isMounted) setIsLoadingReferenceData(false);
      }
    }

    void loadReferenceData();
    return () => {
      isMounted = false;
    };
  }, [accessToken, refresh, status]);

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadCalendarAppointments() {
      setIsLoadingAppointments(true);
      setErrorMessage("");
      try {
        const nextAppointments = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
          loadAppointmentsForCalendarView(currentAccessToken, selectedDate, view),
        );
        if (!isMounted) return;
        setAppointments(nextAppointments);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "No se pudieron cargar las citas."));
      } finally {
        if (isMounted) setIsLoadingAppointments(false);
      }
    }

    void loadCalendarAppointments();
    return () => {
      isMounted = false;
    };
  }, [accessToken, refresh, selectedDate, status, view]);

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadValidationDay() {
      setIsLoadingValidationAppointments(true);
      try {
        const nextAppointments = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
          loadAppointmentsForDate(currentAccessToken, form.date),
        );
        if (!isMounted) return;
        setValidationAppointments(nextAppointments);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "No se pudieron validar las citas del dia seleccionado."));
      } finally {
        if (isMounted) setIsLoadingValidationAppointments(false);
      }
    }

    void loadValidationDay();
    return () => {
      isMounted = false;
    };
  }, [accessToken, form.date, refresh, status]);

  useEffect(() => {
    if (handledDeepLinkRef.current || isLoadingReferenceData || isLoadingAppointments) return;
    if (requestedMode !== "new" && requestedMode !== "edit") return;

    const nextDate = requestedDate ?? selectedDate;
    const appointment =
      requestedMode === "edit" && requestedAppointmentId
        ? plannerAppointments.find((current) => current.id === requestedAppointmentId)
        : null;

    if (requestedMode === "edit" && !appointment) return;

    handledDeepLinkRef.current = true;
    const timeoutId = window.setTimeout(() => {
    if (requestedMode === "new") {
      setEditingAppointmentId(null);
      setCurrentStep(0);
      setFurthestStepReached(0);
      setForm(createInitialForm(nextDate));
      setFeedbackMessage("");
      setErrorMessage("");
      if (isMobileViewport) {
        setShowWizard(false);
        setMobilePanel("wizard");
      } else {
        setMobilePanel(null);
        setShowWizard(true);
      }
      return;
    }

    if (!appointment) return;

    setSelectedAppointmentId(appointment.id);
    setEditingAppointmentId(appointment.id);
    setCurrentStep(0);
    setFurthestStepReached(0);
    setForm({
      existingClientId: appointment.clientId,
      clientName: appointment.client,
      clientPhone: appointment.clientPhone,
      selectedServiceIds: appointment.items.map((item) => item.serviceId),
      touchUpByServiceId: Object.fromEntries(
        appointment.items.map((item) => [item.serviceId, item.isTouchUp]),
      ),
      date: appointment.date,
      time: appointment.time,
      mode: appointment.mode,
      travelFee: String(appointment.travelFee),
      addressSnapshot: appointment.addressSnapshot ?? "",
      notes: appointment.notes ?? "",
    });
    setCancelReason(appointment.cancelReason ?? "");
    setFeedbackMessage("");
    setErrorMessage("");

    if (isMobileViewport) {
      setShowWizard(false);
      setMobilePanel("wizard");
      return;
    }

    setMobilePanel(null);
    setShowWizard(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    isLoadingAppointments,
    isLoadingReferenceData,
    isMobileViewport,
    plannerAppointments,
    requestedAppointmentId,
    requestedDate,
    requestedMode,
    selectedDate,
  ]);

  function clearMessages() {
    setFeedbackMessage("");
    setErrorMessage("");
    setWizardValidationMessage("");
  }

  function handleFormChange(updater: (current: AppointmentForm) => AppointmentForm) {
    setForm(updater);
    setWizardValidationMessage("");
  }

  function getStepValidationMessage(stepIndex: number) {
    if (stepIndex === 0 && !hasClientForStep) {
      return "Selecciona una clienta existente o registra el nombre de una clienta nueva.";
    }

    if (stepIndex === 1 && !hasServiceForStep) {
      return "Selecciona al menos un servicio para continuar.";
    }

    if (stepIndex === 2 && !hasValidTime) {
      return "Escribe la hora en formato 24 horas, por ejemplo 09:30 o 14:30.";
    }

    return "";
  }

  function resetWizard(nextDate = selectedDate) {
    setEditingAppointmentId(null);
    setCurrentStep(0);
    setFurthestStepReached(0);
    setShowWizard(false);
    setMobilePanel(null);
    setForm(createInitialForm(nextDate));
  }

  function handleDayChange(date: string) {
    setSelectedDate(date);
    setSelectedAppointmentId(null);
    setCancelReason("");
    clearMessages();
  }

  function handleExistingClientChange(clientId: string) {
    const client = clients.find((currentClient) => currentClient.id === clientId);
    setForm((current) => ({
      ...current,
      existingClientId: clientId,
      clientName: client?.fullName ?? "",
      clientPhone: client?.whatsapp ?? client?.phone ?? "",
    }));
    clearMessages();
  }

  function toggleService(serviceId: string) {
    setForm((current) => {
      const isSelected = current.selectedServiceIds.includes(serviceId);
      const nextSelectedServiceIds = isSelected
        ? current.selectedServiceIds.filter((service) => service !== serviceId)
        : [...current.selectedServiceIds, serviceId];
      const nextTouchUpByServiceId = { ...current.touchUpByServiceId };
      if (isSelected) delete nextTouchUpByServiceId[serviceId];
      return {
        ...current,
        selectedServiceIds: nextSelectedServiceIds,
        touchUpByServiceId: nextTouchUpByServiceId,
      };
    });
    clearMessages();
  }

  function toggleTouchUp(serviceId: string) {
    setForm((current) => ({
      ...current,
      touchUpByServiceId: {
        ...current.touchUpByServiceId,
        [serviceId]: !current.touchUpByServiceId[serviceId],
      },
    }));
    clearMessages();
  }

  function nextStep() {
    const validationMessage = getStepValidationMessage(currentStep);
    if (validationMessage) {
      setWizardValidationMessage(validationMessage);
      return;
    }

    setWizardValidationMessage("");
    setCurrentStep((step) => {
      const next = Math.min(step + 1, wizardSteps.length - 1);
      setFurthestStepReached((prev) => Math.max(prev, next));
      return next;
    });
  }

  function previousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function goToStep(stepIndex: number) {
    if (stepIndex <= furthestStepReached) {
      setCurrentStep(stepIndex);
    }
  }

  function openNewAppointment() {
    setEditingAppointmentId(null);
    setCurrentStep(0);
    setFurthestStepReached(0);
    setForm(createInitialForm(selectedDate));
    clearMessages();
    if (isMobileViewport) {
      setShowWizard(false);
      setMobilePanel("wizard");
      return;
    }
    setMobilePanel(null);
    setShowWizard(true);
  }

  function openAppointmentDetail(appointment: PlannerAppointment) {
    setSelectedAppointmentId(appointment.id);
    setCancelReason(appointment.cancelReason ?? "");
    clearMessages();
    if (isMobileViewport) {
      setMobilePanel("detail");
      return;
    }
    setShowWizard(false);
  }

  function openWizardForAppointment(appointment: PlannerAppointment) {
    setEditingAppointmentId(appointment.id);
    setCurrentStep(0);
    setFurthestStepReached(0);
    setForm({
      existingClientId: appointment.clientId,
      clientName: appointment.client,
      clientPhone: appointment.clientPhone,
      selectedServiceIds: appointment.items.map((item) => item.serviceId),
      touchUpByServiceId: Object.fromEntries(
        appointment.items.map((item) => [item.serviceId, item.isTouchUp]),
      ),
      date: appointment.date,
      time: appointment.time,
      mode: appointment.mode,
      travelFee: String(appointment.travelFee),
      addressSnapshot: appointment.addressSnapshot ?? "",
      notes: appointment.notes ?? "",
    });
    setCancelReason(appointment.cancelReason ?? "");
    clearMessages();

    if (isMobileViewport) {
      setShowWizard(false);
      setMobilePanel("wizard");
      return;
    }

    setMobilePanel(null);
    setShowWizard(true);
  }

  function shiftDateRange(direction: -1 | 1) {
    if (view === "month") {
      handleDayChange(addMonths(selectedDate, direction));
      return;
    }

    handleDayChange(addDays(selectedDate, view === "week" ? direction * 7 : direction));
  }

  function openDayPicker() {
    const input = datePickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  }

  async function resolveClientId(sessionAccessToken: string) {
    const clientId = form.existingClientId;
    const clientName = form.clientName.trim();
    const phone = normalizeNullable(form.clientPhone);
    const notes = normalizeNullable(form.notes);

    if (clientId) {
      const existingClient = clients.find((client) => client.id === clientId);
      const currentPhone = existingClient?.whatsapp ?? existingClient?.phone ?? null;
      if (existingClient && (existingClient.fullName !== clientName || currentPhone !== phone)) {
        const updatedClient = await updateAdminClient(sessionAccessToken, clientId, {
          fullName: clientName,
          phone,
          whatsapp: phone,
          notes: existingClient.notes,
        });
        setClients((currentClients) =>
          currentClients.map((client) => (client.id === updatedClient.id ? updatedClient : client)),
        );
      }
      return clientId;
    }

    const createdClient = await createAdminClient(sessionAccessToken, {
      fullName: clientName,
      phone,
      whatsapp: phone,
      notes,
    });
    setClients((currentClients) => [createdClient, ...currentClients]);
    return createdClient.id;
  }

  async function saveAppointment() {
    if (!accessToken || !canSaveAppointment) return;
    const sessionAccessToken = accessToken;
    const wasEditingAppointment = Boolean(editingAppointmentId);
    const savedDate = form.date;
    const savedClientName = form.clientName.trim();
    setIsSubmitting(true);
    clearMessages();

    try {
      await withRefreshedToken(sessionAccessToken, refresh, async (currentAccessToken) => {
        const clientId = await resolveClientId(currentAccessToken);
        const notes = normalizeNullable(form.notes);
        const payload = {
          clientId,
          scheduledStart: toHavanaOffsetDateTime(form.date, form.time),
          items: form.selectedServiceIds.map((serviceId) => ({
            serviceId,
            touchUp: Boolean(form.touchUpByServiceId[serviceId]),
          })),
          mode: form.mode,
          travelFee,
          addressSnapshot: form.mode === "HOME" ? normalizeNullable(form.addressSnapshot) : null,
          notes,
        };

        if (editingAppointmentId) {
          await updateAdminAppointment(currentAccessToken, editingAppointmentId, payload);
        } else {
          await createAdminAppointment(currentAccessToken, payload);
        }

        setSelectedDate(savedDate);
        resetWizard(savedDate);
        setSelectedAppointmentId(null);

        await reloadAppointmentData(currentAccessToken, savedDate, savedDate);
      });

      setFeedbackMessage(
        wasEditingAppointment
          ? `Cita actualizada para ${savedClientName}.`
          : `Cita creada para ${savedClientName}.`,
      );
    } catch (error) {
      const message = getErrorMessage(error, "No se pudo guardar la cita.");
      setWizardValidationMessage(message);
      setErrorMessage(message);
      if (
        message.toLowerCase().includes("horario") ||
        message.toLowerCase().includes("fecha") ||
        message.toLowerCase().includes("hora")
      ) {
        setCurrentStep(2);
        setFurthestStepReached((step) => Math.max(step, 2));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeAppointmentStatus(appointment: PlannerAppointment, nextStatus: string) {
    if (!accessToken) return;
    const sessionAccessToken = accessToken;

    if (nextStatus === "CANCELLED" && !cancelReason.trim()) {
      setErrorMessage("Debes indicar el motivo de cancelacion.");
      return;
    }

    setIsSubmitting(true);
    clearMessages();

    try {
      await withRefreshedToken(sessionAccessToken, refresh, async (currentAccessToken) => {
        await updateAdminAppointmentStatus(currentAccessToken, appointment.id, {
          status: nextStatus,
          cancelReason: nextStatus === "CANCELLED" ? cancelReason.trim() : null,
        });
        await reloadAppointmentData(currentAccessToken, selectedDate, appointment.date);
      });

      setFeedbackMessage(
        nextStatus === "COMPLETED"
          ? `La cita de ${appointment.client} ahora cuenta como ingreso completado.`
          : nextStatus === "CANCELLED"
            ? `La cita de ${appointment.client} fue cancelada.`
            : `La cita de ${appointment.client} regreso a estado confirmada.`,
      );
      if (nextStatus === "COMPLETED") {
        setMobilePanel(null);
        setSelectedAppointmentId(null);
        setCancelReason("");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo actualizar el estado de la cita."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteAppointment(appointment: PlannerAppointment) {
    if (!accessToken) return;
    const sessionAccessToken = accessToken;
    setIsSubmitting(true);
    clearMessages();

    try {
      await withRefreshedToken(sessionAccessToken, refresh, async (currentAccessToken) => {
        await deleteAdminAppointment(currentAccessToken, appointment.id);
        await reloadAppointmentData(currentAccessToken, selectedDate, appointment.date);
      });

      if (editingAppointmentId === appointment.id) {
        resetWizard(selectedDate);
      }

      if (selectedAppointmentId === appointment.id) {
        setSelectedAppointmentId(null);
        setCancelReason("");
      }

      setMobilePanel(null);
      setFeedbackMessage(`La cita de ${appointment.client} fue eliminada.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo eliminar la cita."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading" || isLoadingReferenceData) {
    return <LoadingState message="Cargando agenda, clientas y servicios..." />;
  }

  return (
    <>
      <main className="min-w-0 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="min-w-0 space-y-4">
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] sm:text-sm">
                  Citas
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:mt-2 sm:text-2xl">
                  Calendario de citas
                </h2>
              </div>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] sm:h-11 sm:text-sm"
                type="button"
                onClick={openNewAppointment}
              >
                <Plus className="h-4 w-4" />
                Nueva cita
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex w-full overflow-x-auto rounded-2xl bg-[var(--surface-muted)] p-1 text-sm font-semibold sm:w-auto">
                <button
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition sm:flex-none sm:px-4 ${
                    view === "day"
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  type="button"
                  onClick={() => setView("day")}
                >
                  <CalendarDays className="h-4 w-4" />
                  Dia
                </button>
                <button
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition sm:flex-none sm:px-4 ${
                    view === "week"
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  type="button"
                  onClick={() => setView("week")}
                >
                  <CalendarDays className="h-4 w-4" />
                  Semana
                </button>
                <button
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition sm:flex-none sm:px-4 ${
                    view === "month"
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  type="button"
                  onClick={() => setView("month")}
                >
                  <CalendarDays className="h-4 w-4" />
                  Mes
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--surface-muted)] p-1">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
                  type="button"
                  onClick={() => shiftDateRange(-1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {view === "day" ? (
                  <button
                    className="min-w-0 rounded-xl px-3 py-2 text-center text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn)]"
                    type="button"
                    onClick={openDayPicker}
                  >
                    {dateNavigationLabel}
                  </button>
                ) : (
                  <div className="min-w-0 px-3 py-2 text-center text-sm font-semibold text-[var(--text)]">
                    {dateNavigationLabel}
                  </div>
                )}

                <button
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
                  type="button"
                  onClick={() => shiftDateRange(1)}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <input
              ref={datePickerRef}
              className="sr-only"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) {
                  handleDayChange(event.target.value);
                }
              }}
              tabIndex={-1}
              aria-hidden="true"
            />

            <div className={`mt-4 grid gap-1.5 sm:gap-2.5 ${
              view === "month" ? "grid-cols-7" : "[grid-template-columns:repeat(auto-fit,minmax(4.5rem,1fr))]"
            }`}>
              {visibleCalendarDays.map((day) => {
                const count = plannerAppointments.filter((appointment) => appointment.date === day.isoDate).length;
                const active = selectedDate === day.isoDate;
                const isToday = day.isoDate === todayIsoDate;
                const loadLevel = Math.min(count, 3) * (100 / 3);
                const showLoadAnimation = view !== "day";

                return (
                  <button
                    key={day.isoDate}
                    className={`appointment-load-card relative isolate min-w-0 w-full overflow-hidden rounded-[1.1rem] px-1.5 py-2 text-center transition sm:px-3 sm:py-3 ${
                      isToday
                        ? "bg-[var(--accent)] text-white"
                        : active
                          ? "border border-[var(--accent)] bg-[var(--surface)] text-[var(--text)]"
                        : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                    }`}
                    type="button"
                    onClick={() => handleDayChange(day.isoDate)}
                    data-has-load={showLoadAnimation && count > 0}
                    style={
                      showLoadAnimation
                        ? ({
                            "--appointment-load-level": `${loadLevel}%`,
                            "--appointment-load-strong": isToday
                              ? "rgba(255,255,255,0.34)"
                              : "rgba(230,0,35,0.26)",
                            "--appointment-load-soft": isToday
                              ? "rgba(255,255,255,0.18)"
                              : "rgba(230,0,35,0.14)",
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    {showLoadAnimation ? <span className="appointment-load-water" aria-hidden="true" /> : null}
                    <span className="relative z-10 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80 sm:text-xs">
                      {day.label}
                    </span>
                    <span className="relative z-10 mt-0.5 block text-sm font-bold tabular-nums sm:text-base">{day.date}</span>
                    <span
                      className={`relative z-10 mt-1 block max-w-full text-[10px] leading-3 sm:text-xs ${
                        isToday ? "text-white/70" : active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {count} citas
                    </span>
                  </button>
                );
              })}
            </div>

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

            <div className="mt-4 space-y-2">
              {isLoadingAppointments ? (
                <div className="flex items-center gap-3 rounded-[1.5rem] bg-[var(--surface-muted)] p-5">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-muted)]">Cargando citas...</span>
                </div>
              ) : selectedDayAppointments.length ? (
                selectedDayAppointments.map((appointment) => {
                  const isActive = appointment.id === selectedAppointment?.id;

                  return (
                    <button
                      key={appointment.id}
                      className={`block w-full rounded-[1.4rem] p-3.5 text-left transition sm:p-4 ${
                        isActive
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                      }`}
                      type="button"
                      onClick={() => openAppointmentDetail(appointment)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-base font-bold tabular-nums ${
                                isActive ? "text-white" : "text-[var(--accent)]"
                              }`}
                            >
                              {appointment.time}
                            </span>
                            <span
                              className={`truncate text-sm font-semibold ${
                                isActive ? "text-white" : "text-[var(--text)]"
                              }`}
                            >
                              {appointment.client}
                            </span>
                          </div>
                          <p
                            className={`mt-1 truncate text-xs leading-5 ${
                              isActive ? "text-white/70" : "text-[var(--text-muted)]"
                            }`}
                          >
                            {appointment.servicesSummary}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusColor(appointment.status)}`}
                          >
                            {appointment.statusLabel}
                          </span>
                          <div
                            className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] font-medium ${
                              isActive ? "text-white/60" : "text-[var(--text-subtle)]"
                            }`}
                          >
                            <MapPin className="h-3 w-3" />
                            {appointment.mode}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="No hay citas para este dia."
                  action={{
                    label: "Nueva cita",
                    onClick: openNewAppointment,
                  }}
                />
              )}
            </div>
          </article>
        </section>

        <section className="hidden min-w-0 gap-4 lg:grid">
          {showWizard ? (
            <AppointmentWizardPanel
              editingAppointmentId={editingAppointmentId}
              currentStep={currentStep}
              onClose={() => resetWizard(selectedDate)}
              onPreviousStep={previousStep}
              onNextStep={nextStep}
              onSave={() => void saveAppointment()}
              isSubmitting={isSubmitting}
              canSaveAppointment={canSaveAppointment}
              canContinueStep={canContinueStep}
              validationMessage={wizardValidationMessage}
              clients={clients}
              form={form}
              onExistingClientChange={handleExistingClientChange}
              onFormChange={handleFormChange}
              servicesByCategory={servicesByCategory}
              toggleService={toggleService}
              toggleTouchUp={toggleTouchUp}
              selectedServices={selectedServices}
              durationTotal={durationTotal}
              endTimeLabel={endTimeLabel}
              overlappingAppointment={overlappingAppointment}
              isLoadingValidationAppointments={isLoadingValidationAppointments}
              travelFee={travelFee}
              estimatedTotal={estimatedTotal}
              onStepClick={goToStep}
              furthestStepReached={furthestStepReached}
            />
          ) : selectedAppointment ? (
            <AppointmentDetailPanel
              appointment={selectedAppointment}
              cancelReason={cancelReason}
              setCancelReason={setCancelReason}
              isSubmitting={isSubmitting}
              onCompleteToggle={() =>
                void changeAppointmentStatus(
                  selectedAppointment,
                  selectedAppointment.status === "CANCELLED"
                    ? "CONFIRMED"
                    : selectedAppointment.status === "COMPLETED"
                      ? "CONFIRMED"
                      : "COMPLETED",
                )
              }
              onEdit={() => openWizardForAppointment(selectedAppointment)}
              onDelete={() => void deleteAppointment(selectedAppointment)}
              onCancel={() => void changeAppointmentStatus(selectedAppointment, "CANCELLED")}
            />
          ) : (
            <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <CircleDashed className="h-10 w-10 text-[var(--text-subtle)]" />
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  Selecciona una cita o crea una nueva.
                </p>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                  type="button"
                  onClick={openNewAppointment}
                >
                  <Plus className="h-4 w-4" />
                  Nueva cita
                </button>
              </div>
            </article>
          )}
        </section>
      </main>

      <AdminMobileSheet
        open={mobilePanel !== null}
        onClose={() => {
          if (mobilePanel === "wizard") {
            resetWizard(selectedDate);
            return;
          }
          setMobilePanel(null);
        }}
      >
        {mobilePanel === "wizard" ? (
          <AppointmentWizardPanel
            editingAppointmentId={editingAppointmentId}
            currentStep={currentStep}
            onClose={() => resetWizard(selectedDate)}
            onPreviousStep={previousStep}
            onNextStep={nextStep}
            onSave={() => void saveAppointment()}
            isSubmitting={isSubmitting}
            canSaveAppointment={canSaveAppointment}
            canContinueStep={canContinueStep}
            validationMessage={wizardValidationMessage}
            clients={clients}
            form={form}
            onExistingClientChange={handleExistingClientChange}
            onFormChange={handleFormChange}
            servicesByCategory={servicesByCategory}
            toggleService={toggleService}
            toggleTouchUp={toggleTouchUp}
            selectedServices={selectedServices}
            durationTotal={durationTotal}
            endTimeLabel={endTimeLabel}
            overlappingAppointment={overlappingAppointment}
            isLoadingValidationAppointments={isLoadingValidationAppointments}
            travelFee={travelFee}
            estimatedTotal={estimatedTotal}
            onStepClick={goToStep}
            furthestStepReached={furthestStepReached}
          />
        ) : mobilePanel === "detail" && selectedAppointment ? (
          <AppointmentDetailPanel
            appointment={selectedAppointment}
            cancelReason={cancelReason}
            setCancelReason={setCancelReason}
            isSubmitting={isSubmitting}
            onClose={() => setMobilePanel(null)}
            onCompleteToggle={() =>
              void changeAppointmentStatus(
                selectedAppointment,
                selectedAppointment.status === "CANCELLED"
                  ? "CONFIRMED"
                  : selectedAppointment.status === "COMPLETED"
                    ? "CONFIRMED"
                    : "COMPLETED",
              )
            }
            onEdit={() => openWizardForAppointment(selectedAppointment)}
            onDelete={() => void deleteAppointment(selectedAppointment)}
            onCancel={() => void changeAppointmentStatus(selectedAppointment, "CANCELLED")}
          />
        ) : null}
      </AdminMobileSheet>
    </>
  );
}
