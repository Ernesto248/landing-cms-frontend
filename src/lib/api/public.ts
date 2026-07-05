import { apiFetch } from "@/lib/api/http";
import type {
  BusinessHourResponse,
  BusinessProfileResponse,
  GalleryItemResponse,
  LandingContentResponse,
  ServiceResponse,
  TestimonialResponse,
} from "@/lib/api/types";

export function getPublicBusinessProfile() {
  return apiFetch<BusinessProfileResponse>("/public/business-profile", {
    cache: "no-store",
  });
}

export function getPublicBusinessHours() {
  return apiFetch<BusinessHourResponse[]>("/public/business-hours", {
    cache: "no-store",
  });
}

export function getPublicServices() {
  return apiFetch<ServiceResponse[]>("/public/services", {
    cache: "no-store",
  });
}

export function getPublicContent() {
  return apiFetch<LandingContentResponse[]>("/public/content", {
    cache: "no-store",
  });
}

export function getPublicTestimonials() {
  return apiFetch<TestimonialResponse[]>("/public/testimonials", {
    cache: "no-store",
  });
}

export function getPublicGallery() {
  return apiFetch<GalleryItemResponse[]>("/public/gallery", {
    cache: "no-store",
  });
}
