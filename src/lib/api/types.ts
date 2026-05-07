export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type ServiceResponse = {
  id: string;
  category: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  durationMinutes: number;
  supportsTouchUp: boolean;
  touchUpDiscount: number;
  isActive: boolean;
  sortOrder: number;
};

export type BusinessProfileResponse = {
  id: string;
  brandName: string;
  tagline: string | null;
  description: string | null;
  phoneWhatsapp: string;
  addressLine: string | null;
  city: string;
  country: string;
  currencyCode: string;
  timezone: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  bookingEnabled: boolean;
  supportsHomeService: boolean;
  supportsStudioService: boolean;
  updatedAt: string;
};

export type BusinessHourResponse = {
  id: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

export type LandingContentResponse = {
  id: string;
  contentKey: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  jsonValue: Record<string, unknown> | null;
  updatedAt: string;
};

export type TestimonialResponse = {
  id: string;
  clientName: string;
  text: string;
  rating: number | null;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
};

export type GalleryItemResponse = {
  id: string;
  fileKey: string;
  publicUrl: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  isActive: boolean;
  serviceId: string | null;
  serviceName: string | null;
  serviceCategory: string | null;
  createdAt: string;
};

export type AppointmentItemRequest = {
  serviceId: string;
  touchUp: boolean;
};

export type CreateAppointmentRequest = {
  clientId: string;
  scheduledStart: string;
  items: AppointmentItemRequest[];
  mode: string;
  travelFee: number;
  addressSnapshot: string | null;
  notes: string | null;
};

export type AppointmentItemResponse = {
  id: string;
  serviceId: string;
  serviceNameSnapshot: string;
  unitPriceSnapshot: number;
  durationSnapshotMinutes: number;
  isTouchUp: boolean;
  discountAmount: number;
  finalPrice: number;
};

export type AppointmentResponse = {
  id: string;
  clientId: string;
  clientName: string;
  status: string;
  appointmentMode: string;
  scheduledStart: string;
  scheduledEnd: string;
  addressSnapshot: string | null;
  notes: string | null;
  subtotalAmount: number;
  travelFee: number;
  totalAmount: number;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  items: AppointmentItemResponse[];
};

export type UpdateAppointmentStatusRequest = {
  status: string;
  cancelReason: string | null;
};

export type ClientResponse = {
  id: string;
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
  lastVisitAt: string | null;
  totalAppointments: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertClientRequest = {
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
};

export type ExpenseCategoryResponse = {
  id: string;
  name: string;
  isActive: boolean;
};

export type CreateExpenseCategoryRequest = {
  name: string;
  isActive: boolean;
};

export type ExpenseResponse = {
  id: string;
  expenseCategoryId: string | null;
  expenseCategoryName: string | null;
  expenseDate: string;
  description: string;
  amount: number;
  notes: string | null;
  createdAt: string;
};

export type CreateExpenseRequest = {
  expenseCategoryId: string | null;
  expenseDate: string;
  description: string;
  amount: number;
  notes: string | null;
};

export type MonthlyFinanceSummaryResponse = {
  year: number;
  month: number;
  completedIncome: number;
  recordedExpenses: number;
  balance: number;
};

export type FinanceHistoryMonth = {
  year: number;
  month: number;
  income: number;
  expenses: number;
};

export type FinanceHistoryResponse = {
  months: FinanceHistoryMonth[];
};

export type DailyFinanceEntry = {
  date: string;
  income: number;
  expenses: number;
};

export type RangeFinanceResponse = {
  completedIncome: number;
  recordedExpenses: number;
  balance: number;
  expenses: ExpenseResponse[];
  days: DailyFinanceEntry[];
};

export type CategoryEntry = {
  category: string;
  amount: number;
};

export type CategoryBreakdownResponse = {
  incomeBreakdown: CategoryEntry[];
  expenseBreakdown: CategoryEntry[];
};

export type ScheduleBlockResponse = {
  id: string;
  blockDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  isFullDay: boolean;
};

export type CreateScheduleBlockRequest = {
  blockDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  isFullDay: boolean;
};

export type UpsertBusinessHourRequest = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

export type UpsertServiceRequest = {
  category: string;
  name: string;
  description: string | null;
  basePrice: number;
  durationMinutes: number;
  supportsTouchUp: boolean;
  touchUpDiscount: number;
  isActive: boolean;
  sortOrder: number;
};

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: ApiFieldError[];
};
