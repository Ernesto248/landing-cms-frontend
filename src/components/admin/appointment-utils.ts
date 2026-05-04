import type { AppointmentResponse } from "@/lib/api/types";

export type AppointmentMode = "STUDIO" | "HOME";

export type PlannerAppointment = {
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

export function getAppointmentStatusLabel(status: string) {
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  return status;
}

export function getStatusColor(status: string) {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-700";
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (status === "CANCELLED") return "bg-rose-100 text-rose-700";
  return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
}
