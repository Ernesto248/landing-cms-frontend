"use client";

import { addDays as dfAddDays, format as dfFormat, getDay, parseISO, startOfWeek as dfStartOfWeek } from "date-fns";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, CalendarX, Check, CircleDashed, Clock, Loader2, MapPin, Pencil, Plus, Scissors, Trash2, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
import type { AppointmentResponse, ClientResponse, ServiceResponse } from "@/lib/api/types";
import { getHavanaDateTimeParts, getHavanaIsoDate, toHavanaOffsetDateTime } from "@/lib/havana-time";
import { formatDuration, formatPrice } from "@/lib/site-content";

const wizardSteps = ["Cliente", "Servicios", "Horario", "Modalidad", "Resumen"];
const dayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

type AppointmentMode = "STUDIO" | "HOME";

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

type PlannerAppointment = {
  id: string;
  clientId: string;
  client: string;
  clientPhone: string;
  date: string;
  time: string;
  servicesSummary: string;
  status: string;
  statusLabel: string;
  mode: AppointmentMode;
  addressSnapshot: string | null;
  notes: string | null;
  travelFee: number;
  totalAmount: number;
  durationMinutes: number;
  cancelReason: string | null;
  items: AppointmentResponse["items"];
};

function getTodayIsoDate() {
  return getHavanaIsoDate();
}

function addDays(isoDate: string, amount: number) {
  return dfFormat(dfAddDays(parseISO(`${isoDate}T12:00:00`), amount), "yyyy-MM-dd");
}

function startOfWeek(isoDate: string) {
  const date = parseISO(`${isoDate}T12:00:00`);
  const monday = dfStartOfWeek(date, { weekStartsOn: 1 });
  return dfFormat(monday, "yyyy-MM-dd");
}

function buildWeekDays(anchorDate: string): WeekDay[] {
  const monday = startOfWeek(anchorDate);

  return Array.from({ length: 7 }, (_, index) => {
    const isoDate = addDays(monday, index);
    const date = parseISO(`${isoDate}T12:00:00`);

    return {
      label: dayLabels[getDay(date)] ?? "Dia",
      date: dfFormat(date, "dd"),
      isoDate,
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

function getAppointmentStatusLabel(status: string) {
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  return status;
}

function getStatusColor(status: string) {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-700";
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (status === "CANCELLED") return "bg-rose-100 text-rose-700";
  return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
}

function getAppointmentEndTimeMinutes(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number);
  return hours * 60 + minutes + durationMinutes;
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

  return appointments.find((appointment) => {
    if (candidate.id && appointment.id === candidate.id) return false;
    if (appointment.date !== candidate.date || appointment.status === "CANCELLED") return false;

    const appointmentStart = getAppointmentEndTimeMinutes(appointment.time, 0);
    const appointmentEnd = getAppointmentEndTimeMinutes(appointment.time, appointment.durationMinutes);
    return candidateStart < appointmentEnd && candidateEnd > appointmentStart;
  });
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

function EmptyState({ icon: Icon, title, action }: { icon: typeof CalendarX; title: string; action?: { label: string; onClick: () => void } }) {
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

export function AppointmentsPlanner() {
  const searchParams = useSearchParams();
  const { accessToken, refresh, status } = useAdminSession();
  const requestedDate = searchParams.get("date");
  const requestedAppointmentId = searchParams.get("appointmentId");
  const [view, setView] = useState<"day" | "week">("week");
  const [selectedDate, setSelectedDate] = useState(() => requestedDate ?? getTodayIsoDate());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(
    () => requestedAppointmentId,
  );
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
  const [form, setForm] = useState<AppointmentForm>({
    existingClientId: "",
    clientName: "",
    clientPhone: "",
    selectedServiceIds: [],
    touchUpByServiceId: {},
    date: getTodayIsoDate(),
    time: "10:30",
    mode: "STUDIO",
    travelFee: "0",
    addressSnapshot: "",
    notes: "",
  });

  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate]);
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
  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
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
  const canSaveAppointment =
    Boolean(form.existingClientId || form.clientName.trim()) &&
    selectedServices.length > 0 &&
    durationTotal > 0 &&
    !overlappingAppointment &&
    !isLoadingValidationAppointments &&
    !isSubmitting;
  const endTimeLabel = durationTotal
    ? `${String(Math.floor(getAppointmentEndTimeMinutes(form.time, durationTotal) / 60)).padStart(2, "0")}:${String(getAppointmentEndTimeMinutes(form.time, durationTotal) % 60).padStart(2, "0")}`
    : "--:--";

  async function loadAppointmentsForWeek(sessionAccessToken: string, anchorDate: string) {
    const anchorWeekDays = buildWeekDays(anchorDate);
    return getAdminAppointments(
      sessionAccessToken,
      toHavanaOffsetDateTime(anchorWeekDays[0].isoDate, "00:00"),
      toHavanaOffsetDateTime(anchorWeekDays[anchorWeekDays.length - 1].isoDate, "23:59"),
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
    const [nextWeekAppointments, nextValidationAppointments] = await Promise.all([
      loadAppointmentsForWeek(sessionAccessToken, anchorDate),
      loadAppointmentsForDate(sessionAccessToken, validationDate),
    ]);
    setAppointments(nextWeekAppointments);
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
        const [nextClients, nextServices] = await withRefreshedToken<
          [ClientResponse[], ServiceResponse[]]
        >(sessionAccessToken, refresh, (currentAccessToken) =>
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
    return () => { isMounted = false; };
  }, [accessToken, refresh, status]);

  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;
    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadWeekAppointments() {
      setIsLoadingAppointments(true);
      setErrorMessage("");
      try {
        const nextAppointments = await withRefreshedToken(sessionAccessToken, refresh, (currentAccessToken) =>
          loadAppointmentsForWeek(currentAccessToken, selectedDate),
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

    void loadWeekAppointments();
    return () => { isMounted = false; };
  }, [accessToken, refresh, selectedDate, status]);

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
    return () => { isMounted = false; };
  }, [accessToken, form.date, refresh, status]);

  function resetWizard(nextDate = selectedDate) {
    setEditingAppointmentId(null);
    setCurrentStep(0);
    setShowWizard(false);
    setForm({
      existingClientId: "",
      clientName: "",
      clientPhone: "",
      selectedServiceIds: [],
      touchUpByServiceId: {},
      date: nextDate,
      time: "10:30",
      mode: "STUDIO",
      travelFee: "0",
      addressSnapshot: "",
      notes: "",
    });
  }

  function handleDayChange(date: string) {
    setSelectedDate(date);
    setSelectedAppointmentId(null);
    setCancelReason("");
    setFeedbackMessage("");
    setErrorMessage("");
  }

  function handleExistingClientChange(clientId: string) {
    const client = clients.find((currentClient) => currentClient.id === clientId);
    setForm((current) => ({
      ...current,
      existingClientId: clientId,
      clientName: client?.fullName ?? current.clientName,
      clientPhone: client?.whatsapp ?? client?.phone ?? current.clientPhone,
    }));
    setFeedbackMessage("");
    setErrorMessage("");
  }

  function toggleService(serviceId: string) {
    setForm((current) => {
      const isSelected = current.selectedServiceIds.includes(serviceId);
      const nextSelectedServiceIds = isSelected
        ? current.selectedServiceIds.filter((s) => s !== serviceId)
        : [...current.selectedServiceIds, serviceId];
      const nextTouchUpByServiceId = { ...current.touchUpByServiceId };
      if (isSelected) delete nextTouchUpByServiceId[serviceId];
      return { ...current, selectedServiceIds: nextSelectedServiceIds, touchUpByServiceId: nextTouchUpByServiceId };
    });
    setFeedbackMessage("");
    setErrorMessage("");
  }

  function toggleTouchUp(serviceId: string) {
    setForm((current) => ({
      ...current,
      touchUpByServiceId: { ...current.touchUpByServiceId, [serviceId]: !current.touchUpByServiceId[serviceId] },
    }));
    setFeedbackMessage("");
    setErrorMessage("");
  }

  function nextStep() { setCurrentStep((s) => Math.min(s + 1, wizardSteps.length - 1)); }
  function previousStep() { setCurrentStep((s) => Math.max(s - 1, 0)); }

  function loadAppointmentIntoWizard(appointment: PlannerAppointment) {
    setEditingAppointmentId(appointment.id);
    setCurrentStep(0);
    setShowWizard(true);
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
          fullName: clientName, phone, whatsapp: phone, notes: existingClient.notes,
        });
        setClients((c) => c.map((client) => (client.id === updatedClient.id ? updatedClient : client)));
      }
      return clientId;
    }

    const createdClient = await createAdminClient(sessionAccessToken, {
      fullName: clientName, phone, whatsapp: phone, notes,
    });
    setClients((c) => [createdClient, ...c]);
    return createdClient.id;
  }

  async function saveAppointment() {
    if (!accessToken || !canSaveAppointment) return;
    const sessionAccessToken = accessToken;
    setIsSubmitting(true);
    setFeedbackMessage("");
    setErrorMessage("");

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
        await reloadAppointmentData(currentAccessToken, form.date, form.date);
      });

      setSelectedDate(form.date);
      setFeedbackMessage(
        editingAppointmentId
          ? `Cita actualizada para ${form.clientName.trim()}.`
          : `Cita creada para ${form.clientName.trim()}.`,
      );
      resetWizard(form.date);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No se pudo guardar la cita."));
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
    setFeedbackMessage("");
    setErrorMessage("");

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
    setFeedbackMessage("");
    setErrorMessage("");

    try {
      await withRefreshedToken(sessionAccessToken, refresh, async (currentAccessToken) => {
        await deleteAdminAppointment(currentAccessToken, appointment.id);
        await reloadAppointmentData(currentAccessToken, selectedDate, appointment.date);
      });
      if (editingAppointmentId === appointment.id) resetWizard(selectedDate);
      if (selectedAppointmentId === appointment.id) {
        setSelectedAppointmentId(null);
        setCancelReason("");
      }
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
    <main className="min-w-0 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="min-w-0 space-y-4">
        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] sm:text-sm">Citas</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:mt-2 sm:text-2xl">Agenda conectada al backend</h2>
            </div>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] sm:h-11 sm:text-sm"
              type="button"
              onClick={() => {
                resetWizard(selectedDate);
                setShowWizard(true);
                setFeedbackMessage("");
                setErrorMessage("");
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva cita
            </button>
          </div>

          <div className="mt-4 inline-flex rounded-2xl bg-[var(--surface-muted)] p-1 text-sm font-semibold">
            <button
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                view === "day" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              type="button"
              onClick={() => setView("day")}
            >
              <CalendarDays className="h-4 w-4" />
              Dia
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                view === "week" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              type="button"
              onClick={() => setView("week")}
            >
              <CalendarDays className="h-4 w-4" />
              Semana
            </button>
          </div>

          {view === "day" ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
                type="button"
                onClick={() => handleDayChange(addDays(selectedDate, -1))}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-[var(--text)]">
                {(() => {
                  const d = parseISO(`${selectedDate}T12:00:00`);
                  return `${dayLabels[getDay(d)]} ${dfFormat(d, "d MMM")}`;
                })()}
              </span>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
                type="button"
                onClick={() => handleDayChange(addDays(selectedDate, 1))}
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(4.5rem,1fr))] sm:gap-2.5">
            {(
              view === "day"
                ? weekDays.filter((day) => day.isoDate === selectedDate)
                : weekDays
            ).map((day) => {
              const count = plannerAppointments.filter((a) => a.date === day.isoDate).length;
              const active = selectedDate === day.isoDate;

              return (
                <button
                  key={day.isoDate}
                  className={`flex min-w-0 w-full flex-col items-center justify-center rounded-[1.1rem] px-2.5 py-2.5 text-center transition sm:px-3 sm:py-3 ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--secondary-btn)]"
                  }`}
                  type="button"
                  onClick={() => handleDayChange(day.isoDate)}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80 sm:text-xs">
                    {day.label}
                  </span>
                  <span className="mt-0.5 text-sm font-bold tabular-nums sm:text-base">{day.date}</span>
                  <span
                    className={`mt-1 max-w-full text-[10px] leading-3 sm:text-xs ${active ? "text-white/70" : "text-[var(--text-muted)]"}`}
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
                    onClick={() => {
                      setSelectedAppointmentId(appointment.id);
                      setCancelReason(appointment.cancelReason ?? "");
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-bold tabular-nums ${isActive ? "text-white" : "text-[var(--accent)]"}`}>
                            {appointment.time}
                          </span>
                          <span className={`truncate text-sm font-semibold ${isActive ? "text-white" : "text-[var(--text)]"}`}>
                            {appointment.client}
                          </span>
                        </div>
                        <p className={`mt-1 truncate text-xs leading-5 ${isActive ? "text-white/70" : "text-[var(--text-muted)]"}`}>
                          {appointment.servicesSummary}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusColor(appointment.status)}`}>
                          {appointment.statusLabel}
                        </span>
                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] font-medium ${isActive ? "text-white/60" : "text-[var(--text-subtle)]"}`}>
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
                  onClick: () => {
                    resetWizard(selectedDate);
                    setShowWizard(true);
                    setFeedbackMessage("");
                    setErrorMessage("");
                  },
                }}
              />
            )}
          </div>
        </article>
      </section>

      <section className="min-w-0 grid gap-4">
        {showWizard ? (
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {editingAppointmentId ? "Editar cita" : "Nueva cita"}
              </p>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
                type="button"
                onClick={() => resetWizard(selectedDate)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-1">
              {wizardSteps.map((step, index) => (
                <div key={step} className="flex-1">
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                      index <= currentStep ? "bg-[var(--accent)]" : "bg-[var(--secondary-btn)]"
                    }`} />
                    {index < wizardSteps.length - 1 ? (
                      <div className={`h-1.5 w-1.5 rounded-full ${index < currentStep ? "bg-[var(--accent)]" : "bg-[var(--secondary-btn)]"}`} />
                    ) : null}
                  </div>
                  <p className={`mt-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    index <= currentStep ? "text-[var(--accent)]" : "text-[var(--text-subtle)]"
                  }`}>
                    {step.slice(0, 4)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              {currentStep === 0 ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-[var(--text)]">
                    Clienta existente
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                      value={form.existingClientId}
                      onChange={(event) => handleExistingClientChange(event.target.value)}
                    >
                      <option value="">Registrar clienta nueva</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.fullName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    Nombre
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                      value={form.clientName}
                      onChange={(e) => setForm((c) => ({ ...c, clientName: e.target.value }))}
                      placeholder="Nombre completo"
                    />
                  </label>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    WhatsApp
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                      value={form.clientPhone}
                      onChange={(e) => setForm((c) => ({ ...c, clientPhone: e.target.value }))}
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
                                    <p className={`text-sm font-semibold ${selected ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{service.name}</p>
                                    <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                                      {formatDuration(service.durationMinutes)} · {formatPrice(finalPrice)}
                                    </p>
                                  </div>
                                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                    selected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-input)] bg-[var(--surface)]"
                                  }`}>
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
                                  <span className="ml-auto text-[var(--accent)] font-semibold">-{formatPrice(service.touchUpDiscount)}</span>
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
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((c) => ({ ...c, date: event.target.value }))}
                    />
                  </label>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    Hora de inicio
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                      type="time"
                      value={form.time}
                      onChange={(event) => setForm((c) => ({ ...c, time: event.target.value }))}
                    />
                  </label>
                  <div className="rounded-[1.2rem] bg-[var(--surface-muted)] p-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-[var(--text-subtle)]" />
                        <span className="text-[var(--text-muted)]">{formatDuration(durationTotal)}</span>
                      </div>
                      <span className="text-[var(--text-subtle)]">|</span>
                      <span className="text-[var(--text-muted)]">{form.time} – {endTimeLabel}</span>
                    </div>
                    {overlappingAppointment ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-[var(--danger-bg)] p-2.5 text-xs font-medium text-[var(--danger)]">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Solapa con {overlappingAppointment.client} a las {overlappingAppointment.time}.</span>
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
                          onClick={() => setForm((c) => ({ ...c, mode }))}
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
                          onChange={(e) => setForm((c) => ({ ...c, travelFee: e.target.value }))}
                        />
                      </label>
                      <label className="block text-sm font-medium text-[var(--text)]">
                        Direccion
                        <textarea
                          className="mt-2 h-20 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
                          value={form.addressSnapshot}
                          onChange={(e) => setForm((c) => ({ ...c, addressSnapshot: e.target.value }))}
                        />
                      </label>
                    </>
                  ) : null}
                  <label className="block text-sm font-medium text-[var(--text)]">
                    Notas
                    <textarea
                      className="mt-2 h-20 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
                      value={form.notes}
                      onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
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
                      <span className="text-[var(--text)]">{selectedServices.length ? selectedServices.map((s) => s.name).join(", ") : "Sin seleccionar"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[var(--text-subtle)]" />
                      <span className="text-[var(--text)]">{form.date} · {form.time} – {endTimeLabel} · {formatDuration(durationTotal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[var(--text-subtle)]" />
                      <span className="text-[var(--text)]">{form.mode === "STUDIO" ? "Estudio" : "A domicilio"}</span>
                      {form.mode === "HOME" ? <span className="text-[var(--accent)] font-semibold ml-auto">{formatPrice(travelFee)}</span> : null}
                    </div>
                    <div className="mt-1 border-t border-[var(--secondary-btn)] pt-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Total</span>
                        <span className="text-lg font-bold text-[var(--text)]">{formatPrice(estimatedTotal)}</span>
                      </div>
                    </div>
                    {form.notes ? (
                      <p className="text-xs text-[var(--text-muted)] mt-1">Nota: {form.notes}</p>
                    ) : null}
                    {overlappingAppointment ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-[var(--danger-bg)] p-2.5 text-xs font-medium text-[var(--danger)]">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Conflicto: se cruza con {overlappingAppointment.client} a las {overlappingAppointment.time}.</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--secondary-btn)] px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn-hover)] disabled:opacity-30 sm:h-11"
                type="button"
                onClick={previousStep}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
              {currentStep < wizardSteps.length - 1 ? (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] sm:h-11"
                  type="button"
                  onClick={nextStep}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition sm:h-11 ${
                    canSaveAppointment ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)]" : "bg-[var(--text-subtle)] cursor-not-allowed"
                  }`}
                  type="button"
                  onClick={() => void saveAppointment()}
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
          </article>
        ) : selectedAppointment ? (
          <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">Detalle de cita</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusColor(selectedAppointment.status)}`}>
                {selectedAppointment.statusLabel}
              </span>
            </div>

            <h3 className="mt-2 break-words text-xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-2xl">
              {selectedAppointment.client}
            </h3>
            <div className="mt-4 space-y-2.5 text-sm text-[var(--text-muted)]">
              <div className="flex min-w-0 items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-[var(--text)]">{selectedAppointment.time}</span>
                  <span> · {formatDuration(selectedAppointment.durationMinutes)}</span>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-2">
                <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
                <div className="min-w-0 flex-1 break-words">{selectedAppointment.servicesSummary}</div>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
                <div className="min-w-0 flex-1 truncate">{selectedAppointment.mode === "STUDIO" ? "Estudio" : "A domicilio"}</div>
                {selectedAppointment.mode === "HOME" ? <span className="shrink-0 font-semibold text-[var(--accent)]">+{formatPrice(selectedAppointment.travelFee)}</span> : null}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
                <div className="min-w-0 flex-1 break-words">{selectedAppointment.clientPhone || "Sin telefono"}</div>
              </div>
              {selectedAppointment.addressSnapshot ? (
                <p className="break-words text-xs text-[var(--text-subtle)]">{selectedAppointment.addressSnapshot}</p>
              ) : null}
              {selectedAppointment.notes ? (
                <p className="break-words rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs">{selectedAppointment.notes}</p>
              ) : null}
              {selectedAppointment.cancelReason ? (
                <div className="flex items-start gap-1.5 rounded-xl bg-[var(--danger-bg)] p-2.5 text-xs font-medium text-[var(--danger)]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">Cancelado: {selectedAppointment.cancelReason}</span>
                </div>
              ) : null}
              <div className="mt-2 border-t border-[var(--secondary-btn)] pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-subtle)]">Total</span>
                  <span className="text-xl font-bold text-[var(--text)]">{formatPrice(selectedAppointment.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50 sm:h-11"
                type="button"
                onClick={() =>
                  void changeAppointmentStatus(
                    selectedAppointment,
                    selectedAppointment.status === "CANCELLED"
                      ? "CONFIRMED"
                      : selectedAppointment.status === "COMPLETED"
                        ? "CONFIRMED"
                        : "COMPLETED",
                  )
                }
                disabled={isSubmitting}
              >
                <Check className="h-4 w-4" />
                {selectedAppointment.status === "CANCELLED"
                  ? "Reactivar"
                  : selectedAppointment.status === "COMPLETED"
                    ? "Volver a confirmada"
                    : "Completar"}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn)] sm:h-11"
                type="button"
                onClick={() => loadAppointmentIntoWizard(selectedAppointment)}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            </div>

            <button
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(145,145,140,0.35)] px-4 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] sm:h-11"
              type="button"
              onClick={() => void deleteAppointment(selectedAppointment)}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>

            {selectedAppointment.status !== "CANCELLED" ? (
              <div className="mt-3 space-y-3 rounded-[1.2rem] bg-[var(--surface-muted)] p-4">
                <label className="block text-sm font-medium text-[var(--text)]">
                  Motivo de cancelacion
                  <textarea
                    className="mt-2 h-20 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </label>
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 sm:h-11"
                  type="button"
                  onClick={() => void changeAppointmentStatus(selectedAppointment, "CANCELLED")}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                  Cancelar cita
                </button>
              </div>
            ) : null}
          </article>
        ) : (
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <CircleDashed className="h-10 w-10 text-[var(--text-subtle)]" />
              <p className="text-sm leading-6 text-[var(--text-muted)]">Selecciona una cita o crea una nueva.</p>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                type="button"
                onClick={() => {
                  resetWizard(selectedDate);
                  setShowWizard(true);
                  setFeedbackMessage("");
                  setErrorMessage("");
                }}
              >
                <Plus className="h-4 w-4" />
                Nueva cita
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
