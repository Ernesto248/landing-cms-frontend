export type FinanceMovementType = "Ingreso" | "Gasto";

export type FinanceMovement = {
  id: string;
  month: string;
  type: FinanceMovementType;
  detail: string;
  amount: number;
};

export const FINANCE_STORAGE_KEY = "jeni-finance-mock";

export const financeMonthOptions = ["2026-03", "2026-04", "2026-05"];

export const defaultFinanceMovements: FinanceMovement[] = [
  {
    id: "income-1",
    month: "2026-05",
    type: "Ingreso",
    detail: "Cita completada · Aplicacion de Clasicas",
    amount: 3000,
  },
  {
    id: "expense-1",
    month: "2026-05",
    type: "Gasto",
    detail: "Reposicion de insumos",
    amount: 800,
  },
  {
    id: "income-2",
    month: "2026-05",
    type: "Ingreso",
    detail: "Cita completada · Laminado de cejas",
    amount: 1400,
  },
  {
    id: "income-3",
    month: "2026-04",
    type: "Ingreso",
    detail: "Cita completada · Volumen 2D",
    amount: 3000,
  },
  {
    id: "expense-2",
    month: "2026-04",
    type: "Gasto",
    detail: "Pago de transporte",
    amount: 450,
  },
];

export function parseFinanceMovements(raw: string | null) {
  if (!raw) {
    return defaultFinanceMovements;
  }

  try {
    const parsed = JSON.parse(raw) as FinanceMovement[];
    return Array.isArray(parsed) ? parsed : defaultFinanceMovements;
  } catch {
    return defaultFinanceMovements;
  }
}

export function formatCurrency(value: number) {
  const prefix = value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(0)} CUP`;
}

export function appointmentIncomeMovementId(appointmentId: string) {
  return `appointment-income-${appointmentId}`;
}
