import { apiFetch, type JsonInit } from "@/lib/api/http";
import type {
  AppointmentResponse,
  BusinessHourResponse,
  BusinessProfileResponse,
  ClientResponse,
  CreateAppointmentRequest,
  CreateExpenseCategoryRequest,
  CreateExpenseRequest,
  CreateScheduleBlockRequest,
  ExpenseCategoryResponse,
  ExpenseResponse,
  FinanceHistoryResponse,
  GalleryItemResponse,
  LandingContentResponse,
  MonthlyFinanceSummaryResponse,
  RangeFinanceResponse,
  ScheduleBlockResponse,
  ServiceResponse,
  TestimonialResponse,
  UpdateAppointmentStatusRequest,
  UpsertBusinessHourRequest,
  UpsertClientRequest,
  UpsertServiceRequest,
} from "@/lib/api/types";

type AdminRequestOptions = JsonInit & {
  accessToken: string;
};

type UpdateBusinessProfileRequest = {
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
};

type UpsertLandingContentRequest = {
  contentKey: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  jsonValue: Record<string, unknown> | null;
};

type UpsertTestimonialRequest = {
  clientName: string;
  text: string;
  rating: number;
  isFeatured: boolean;
  sortOrder: number;
};

type UpdateGalleryItemRequest = {
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  isActive: boolean;
};

function adminFetch<T>(path: string, { accessToken, headers, ...init }: AdminRequestOptions) {
  return apiFetch<T>(path, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function getAdminBusinessProfile(accessToken: string) {
  return adminFetch<BusinessProfileResponse>("/admin/business/profile", {
    accessToken,
    method: "GET",
  });
}

export function updateAdminBusinessProfile(
  accessToken: string,
  body: UpdateBusinessProfileRequest,
) {
  return adminFetch<BusinessProfileResponse>("/admin/business/profile", {
    accessToken,
    method: "PUT",
    body,
  });
}

export function getAdminLandingContent(accessToken: string) {
  return adminFetch<LandingContentResponse[]>("/admin/content", {
    accessToken,
    method: "GET",
  });
}

export function upsertAdminLandingContent(
  accessToken: string,
  body: UpsertLandingContentRequest,
) {
  return adminFetch<LandingContentResponse>("/admin/content", {
    accessToken,
    method: "PUT",
    body,
  });
}

export function uploadAdminHeroImage(accessToken: string, formData: FormData) {
  return apiFetch<LandingContentResponse>("/admin/content/hero-image", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
}

export function getAdminTestimonials(accessToken: string) {
  return adminFetch<TestimonialResponse[]>("/admin/testimonials", {
    accessToken,
    method: "GET",
  });
}

export function createAdminTestimonial(
  accessToken: string,
  body: UpsertTestimonialRequest,
) {
  return adminFetch<TestimonialResponse>("/admin/testimonials", {
    accessToken,
    method: "POST",
    body,
  });
}

export function updateAdminTestimonial(
  accessToken: string,
  testimonialId: string,
  body: UpsertTestimonialRequest,
) {
  return adminFetch<TestimonialResponse>(`/admin/testimonials/${testimonialId}`, {
    accessToken,
    method: "PUT",
    body,
  });
}

export function getAdminGallery(accessToken: string) {
  return adminFetch<GalleryItemResponse[]>("/admin/gallery", {
    accessToken,
    method: "GET",
  });
}

export function updateAdminGalleryItem(
  accessToken: string,
  galleryItemId: string,
  body: UpdateGalleryItemRequest,
) {
  return adminFetch<GalleryItemResponse>(`/admin/gallery/${galleryItemId}`, {
    accessToken,
    method: "PUT",
    body,
  });
}

export function getAdminServices(accessToken: string) {
  return adminFetch<ServiceResponse[]>("/admin/services", {
    accessToken,
    method: "GET",
  });
}

export function getAdminClients(accessToken: string) {
  return adminFetch<ClientResponse[]>("/admin/clients", {
    accessToken,
    method: "GET",
  });
}

export function createAdminClient(accessToken: string, body: UpsertClientRequest) {
  return adminFetch<ClientResponse>("/admin/clients", {
    accessToken,
    method: "POST",
    body,
  });
}

export function updateAdminClient(accessToken: string, clientId: string, body: UpsertClientRequest) {
  return adminFetch<ClientResponse>(`/admin/clients/${clientId}`, {
    accessToken,
    method: "PUT",
    body,
  });
}

export function getAdminAppointments(accessToken: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to }).toString();
  return adminFetch<AppointmentResponse[]>(`/admin/appointments?${query}`, {
    accessToken,
    method: "GET",
  });
}

export function createAdminAppointment(accessToken: string, body: CreateAppointmentRequest) {
  return adminFetch<AppointmentResponse>("/admin/appointments", {
    accessToken,
    method: "POST",
    body,
  });
}

export function updateAdminAppointment(
  accessToken: string,
  appointmentId: string,
  body: CreateAppointmentRequest,
) {
  return adminFetch<AppointmentResponse>(`/admin/appointments/${appointmentId}`, {
    accessToken,
    method: "PUT",
    body,
  });
}

export function updateAdminAppointmentStatus(
  accessToken: string,
  appointmentId: string,
  body: UpdateAppointmentStatusRequest,
) {
  return adminFetch<AppointmentResponse>(`/admin/appointments/${appointmentId}/status`, {
    accessToken,
    method: "PATCH",
    body,
  });
}

export function getAdminMonthlyFinanceSummary(accessToken: string, year: number, month: number) {
  const query = new URLSearchParams({ year: String(year), month: String(month) }).toString();
  return adminFetch<MonthlyFinanceSummaryResponse>(`/admin/finance/monthly-summary?${query}`, {
    accessToken,
    method: "GET",
  });
}

export function getAdminFinanceHistory(accessToken: string, months: number) {
  const query = new URLSearchParams({ months: String(months) }).toString();
  return adminFetch<FinanceHistoryResponse>(`/admin/finance/history?${query}`, {
    accessToken,
    method: "GET",
  });
}

export function getAdminRangeFinanceSummary(accessToken: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to }).toString();
  return adminFetch<RangeFinanceResponse>(`/admin/finance/range-summary?${query}`, {
    accessToken,
    method: "GET",
  });
}

export function getAdminExpenseCategories(accessToken: string) {
  return adminFetch<ExpenseCategoryResponse[]>("/admin/expense-categories", {
    accessToken,
    method: "GET",
  });
}

export function createAdminExpenseCategory(
  accessToken: string,
  body: CreateExpenseCategoryRequest,
) {
  return adminFetch<ExpenseCategoryResponse>("/admin/expense-categories", {
    accessToken,
    method: "POST",
    body,
  });
}

export function getAdminExpenses(accessToken: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to }).toString();
  return adminFetch<ExpenseResponse[]>(`/admin/expenses?${query}`, {
    accessToken,
    method: "GET",
  });
}

export function createAdminExpense(accessToken: string, body: CreateExpenseRequest) {
  return adminFetch<ExpenseResponse>("/admin/expenses", {
    accessToken,
    method: "POST",
    body,
  });
}

export function deleteAdminAppointment(accessToken: string, appointmentId: string) {
  return adminFetch<null>(`/admin/appointments/${appointmentId}`, {
    accessToken,
    method: "DELETE",
  });
}

// Business hours
export function getAdminBusinessHours(accessToken: string) {
  return adminFetch<BusinessHourResponse[]>("/admin/business/hours", {
    accessToken,
    method: "GET",
  });
}

export function updateAdminBusinessHours(accessToken: string, body: UpsertBusinessHourRequest[]) {
  return adminFetch<BusinessHourResponse[]>("/admin/business/hours", {
    accessToken,
    method: "PUT",
    body,
  });
}

// Schedule blocks
export function getAdminScheduleBlocks(accessToken: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to }).toString();
  return adminFetch<ScheduleBlockResponse[]>(`/admin/business/schedule-blocks?${query}`, {
    accessToken,
    method: "GET",
  });
}

export function createAdminScheduleBlock(accessToken: string, body: CreateScheduleBlockRequest) {
  return adminFetch<ScheduleBlockResponse>("/admin/business/schedule-blocks", {
    accessToken,
    method: "POST",
    body,
  });
}

export function deleteAdminScheduleBlock(accessToken: string, scheduleBlockId: string) {
  return adminFetch<null>(`/admin/business/schedule-blocks/${scheduleBlockId}`, {
    accessToken,
    method: "DELETE",
  });
}

// Service catalog
export function createAdminService(accessToken: string, body: UpsertServiceRequest) {
  return adminFetch<ServiceResponse>("/admin/services", {
    accessToken,
    method: "POST",
    body,
  });
}

export function updateAdminService(accessToken: string, serviceId: string, body: UpsertServiceRequest) {
  return adminFetch<ServiceResponse>(`/admin/services/${serviceId}`, {
    accessToken,
    method: "PUT",
    body,
  });
}

// Gallery upload / delete
export function uploadAdminGalleryImage(
  accessToken: string,
  formData: FormData,
) {
  return apiFetch<GalleryItemResponse>("/admin/gallery", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
}

export function deleteAdminGalleryItem(accessToken: string, galleryItemId: string) {
  return adminFetch<null>(`/admin/gallery/${galleryItemId}`, {
    accessToken,
    method: "DELETE",
  });
}
