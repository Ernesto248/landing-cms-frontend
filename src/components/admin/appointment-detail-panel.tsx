import { AlertCircle, Check, Clock, MapPin, Pencil, Scissors, Trash2, Users, X } from "lucide-react";

import { getStatusColor, type PlannerAppointment } from "@/components/admin/appointment-utils";
import { formatDuration, formatPrice } from "@/lib/site-content";

export type DetailPanelProps = {
  appointment: PlannerAppointment;
  cancelReason: string;
  setCancelReason: (value: string) => void;
  isSubmitting: boolean;
  onClose?: () => void;
  onCompleteToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

export function AppointmentDetailPanel({
  appointment,
  cancelReason,
  setCancelReason,
  isSubmitting,
  onClose,
  onCompleteToggle,
  onEdit,
  onDelete,
  onCancel,
}: DetailPanelProps) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:rounded-[2rem] sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
          Detalle de cita
        </p>
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusColor(appointment.status)}`}
          >
            {appointment.statusLabel}
          </span>
          {onClose ? (
            <button
              aria-label="Cerrar detalle"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
              type="button"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <h3 className="mt-2 break-words text-xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-2xl">
        {appointment.client}
      </h3>
      <div className="mt-4 space-y-2.5 text-sm text-[var(--text-muted)]">
        <div className="flex min-w-0 items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-[var(--text)]">{appointment.time}</span>
            <span> · {formatDuration(appointment.durationMinutes)}</span>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-2">
          <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
          <div className="min-w-0 flex-1 break-words">{appointment.servicesSummary}</div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
          <div className="min-w-0 flex-1 truncate">
            {appointment.mode === "STUDIO" ? "Estudio" : "A domicilio"}
          </div>
          {appointment.mode === "HOME" ? (
            <span className="shrink-0 font-semibold text-[var(--accent)]">+{formatPrice(appointment.travelFee)}</span>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
          <div className="min-w-0 flex-1 break-words">{appointment.clientPhone || "Sin telefono"}</div>
        </div>
        {appointment.addressSnapshot ? (
          <p className="break-words text-xs text-[var(--text-subtle)]">{appointment.addressSnapshot}</p>
        ) : null}
        {appointment.notes ? (
          <p className="break-words rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs">{appointment.notes}</p>
        ) : null}
        {appointment.cancelReason ? (
          <div className="flex items-start gap-1.5 rounded-xl bg-[var(--danger-bg)] p-2.5 text-xs font-medium text-[var(--danger)]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">Cancelado: {appointment.cancelReason}</span>
          </div>
        ) : null}
        <div className="mt-2 border-t border-[var(--secondary-btn)] pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-subtle)]">Total</span>
            <span className="text-xl font-bold text-[var(--text)]">{formatPrice(appointment.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50 sm:h-11"
          type="button"
          onClick={onCompleteToggle}
          disabled={isSubmitting}
        >
          <Check className="h-4 w-4" />
          {appointment.status === "CANCELLED"
            ? "Reactivar"
            : appointment.status === "COMPLETED"
              ? "Volver a confirmada"
              : "Completar"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--secondary-btn)] sm:h-11"
          type="button"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
      </div>

      <button
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(145,145,140,0.35)] px-4 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] sm:h-11"
        type="button"
        onClick={onDelete}
        disabled={isSubmitting}
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </button>

      {appointment.status !== "CANCELLED" ? (
        <div className="mt-3 space-y-3 rounded-[1.2rem] bg-[var(--surface-muted)] p-4">
          <label className="block text-sm font-medium text-[var(--text)]">
            Motivo de cancelacion
            <textarea
              className="mt-2 h-20 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </label>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 sm:h-11"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <Trash2 className="h-4 w-4" />
            Cancelar cita
          </button>
        </div>
      ) : null}
    </article>
  );
}
