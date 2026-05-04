import { safeApiFetch } from "@/lib/api/http";
import type {
  BusinessHourResponse,
  BusinessProfileResponse,
  GalleryItemResponse,
  LandingContentResponse,
  ServiceResponse,
  TestimonialResponse,
} from "@/lib/api/types";

export function getPublicBusinessProfile() {
  return safeApiFetch<BusinessProfileResponse>("/public/business-profile", {
    cache: "no-store",
  });
}

export function getPublicBusinessHours() {
  return safeApiFetch<BusinessHourResponse[]>("/public/business-hours", {
    cache: "no-store",
  });
}

export function getPublicServices() {
  return safeApiFetch<ServiceResponse[]>("/public/services", {
    cache: "no-store",
  });
}

export function getPublicContent() {
  return safeApiFetch<LandingContentResponse[]>("/public/content", {
    cache: "no-store",
  });
}

export function getPublicTestimonials() {
  return safeApiFetch<TestimonialResponse[]>("/public/testimonials", {
    cache: "no-store",
  });
}

export function getPublicGallery() {
  return safeApiFetch<GalleryItemResponse[]>("/public/gallery", {
    cache: "no-store",
  });
}
