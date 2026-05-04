export type AppointmentMode = "STUDIO" | "HOME";
export type AppointmentStatus = "Confirmada" | "Pendiente" | "Completada";

export type AppointmentItem = {
  slug: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export type AppointmentRecord = {
  id: string;
  dayLabel: string;
  date: string;
  time: string;
  client: string;
  clientPhone: string;
  items: AppointmentItem[];
  servicesSummary: string;
  status: AppointmentStatus;
  mode: AppointmentMode;
  notes?: string;
  travelFee: number;
  totalAmount: number;
  durationMinutes: number;
};

export const APPOINTMENTS_STORAGE_KEY = "jeni-appointments-mock";

export const weekDays = [
  { label: "Lun", date: "12", isoDate: "2026-05-12" },
  { label: "Mar", date: "13", isoDate: "2026-05-13" },
  { label: "Mie", date: "14", isoDate: "2026-05-14" },
  { label: "Jue", date: "15", isoDate: "2026-05-15" },
  { label: "Vie", date: "16", isoDate: "2026-05-16" },
] as const;

export const defaultAppointments: AppointmentRecord[] = [
  {
    id: "apt-1",
    dayLabel: "Lun",
    date: "2026-05-12",
    time: "09:00",
    client: "Mariela",
    clientPhone: "55901111",
    items: [
      { slug: "diseno-cejas-cera", name: "Diseno de cejas con cera", price: 300, durationMinutes: 15 },
    ],
    servicesSummary: "Diseno de cejas con cera",
    status: "Confirmada",
    mode: "STUDIO",
    notes: "Prefiere atencion rapida antes del trabajo.",
    travelFee: 0,
    totalAmount: 300,
    durationMinutes: 15,
  },
  {
    id: "apt-2",
    dayLabel: "Lun",
    date: "2026-05-12",
    time: "11:30",
    client: "Yanelis",
    clientPhone: "55902222",
    items: [
      { slug: "clasicas", name: "Aplicacion de Clasicas", price: 3000, durationMinutes: 150 },
    ],
    servicesSummary: "Aplicacion de Clasicas",
    status: "Pendiente",
    mode: "HOME",
    notes: "Confirmar direccion y fee de traslado.",
    travelFee: 500,
    totalAmount: 3500,
    durationMinutes: 150,
  },
  {
    id: "apt-3",
    dayLabel: "Lun",
    date: "2026-05-12",
    time: "15:00",
    client: "Laura",
    clientPhone: "55903333",
    items: [
      { slug: "laminado-cejas", name: "Laminado de cejas", price: 1400, durationMinutes: 60 },
      { slug: "tinte-henna", name: "Aplicacion de tinte henna", price: 300, durationMinutes: 15 },
    ],
    servicesSummary: "Laminado de cejas + henna",
    status: "Confirmada",
    mode: "STUDIO",
    notes: "Quiere mantener el mismo acabado del mes pasado.",
    travelFee: 0,
    totalAmount: 1700,
    durationMinutes: 75,
  },
  {
    id: "apt-4",
    dayLabel: "Mar",
    date: "2026-05-13",
    time: "10:00",
    client: "Diana",
    clientPhone: "55904444",
    items: [
      { slug: "volumen-2d", name: "Aplicacion de Volumen 2D", price: 3000, durationMinutes: 150 },
    ],
    servicesSummary: "Aplicacion de Volumen 2D",
    status: "Confirmada",
    mode: "HOME",
    notes: "Llevar recambio de cepillo.",
    travelFee: 400,
    totalAmount: 3400,
    durationMinutes: 150,
  },
  {
    id: "apt-5",
    dayLabel: "Jue",
    date: "2026-05-15",
    time: "13:00",
    client: "Paola",
    clientPhone: "55905555",
    items: [
      { slug: "lifting-pestanas", name: "Lifting de pestanas", price: 1700, durationMinutes: 60 },
    ],
    servicesSummary: "Lifting de pestanas",
    status: "Pendiente",
    mode: "STUDIO",
    notes: "Sin notas adicionales.",
    travelFee: 0,
    totalAmount: 1700,
    durationMinutes: 60,
  },
  {
    id: "apt-6",
    dayLabel: "Vie",
    date: "2026-05-16",
    time: "16:30",
    client: "Nayeli",
    clientPhone: "55906666",
    items: [
      { slug: "volumen-3d", name: "Aplicacion de Volumen 3D", price: 3300, durationMinutes: 150 },
    ],
    servicesSummary: "Aplicacion de Volumen 3D",
    status: "Confirmada",
    mode: "STUDIO",
    notes: "Sin notas adicionales.",
    travelFee: 0,
    totalAmount: 3300,
    durationMinutes: 150,
  },
];

export function parseAppointments(raw: string | null) {
  if (!raw) {
    return defaultAppointments;
  }

  try {
    const parsed = JSON.parse(raw) as AppointmentRecord[];
    return Array.isArray(parsed) ? parsed : defaultAppointments;
  } catch {
    return defaultAppointments;
  }
}

export function getDayLabelFromDate(date: string) {
  return weekDays.find((day) => day.isoDate === date)?.label ?? "Lun";
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getAppointmentEndTimeMinutes(startTime: string, durationMinutes: number) {
  return timeToMinutes(startTime) + durationMinutes;
}

export function hasAppointmentOverlap(
  candidate: {
    id?: string | null;
    date: string;
    time: string;
    durationMinutes: number;
  },
  appointments: AppointmentRecord[],
) {
  const candidateStart = timeToMinutes(candidate.time);
  const candidateEnd = getAppointmentEndTimeMinutes(candidate.time, candidate.durationMinutes);

  return appointments.find((appointment) => {
    if (candidate.id && appointment.id === candidate.id) {
      return false;
    }

    if (appointment.date !== candidate.date) {
      return false;
    }

    const appointmentStart = timeToMinutes(appointment.time);
    const appointmentEnd = getAppointmentEndTimeMinutes(
      appointment.time,
      appointment.durationMinutes,
    );

    return candidateStart < appointmentEnd && candidateEnd > appointmentStart;
  });
}
