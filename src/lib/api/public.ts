import { apiFetch, ApiError } from "@/lib/api/http";
import type {
  BusinessHourResponse,
  BusinessProfileResponse,
  GalleryItemResponse,
  LandingContentResponse,
  ServiceResponse,
  TestimonialResponse,
} from "@/lib/api/types";

async function publicApiFetch<T>(path: string, fallback: T) {
  try {
    return await apiFetch<T>(path, {
      cache: "no-store",
    });
  } catch (error) {
    const detail =
      error instanceof ApiError
        ? `${error.status} ${error.message}`
        : error instanceof Error
          ? error.message
          : "Unknown error";

    console.warn(`[public-api] Falling back for ${path}: ${detail}`);
    return fallback;
  }
}

export function getPublicBusinessProfile() {
  return publicApiFetch<BusinessProfileResponse | null>("/public/business-profile", null);
}

export function getPublicBusinessHours() {
  return publicApiFetch<BusinessHourResponse[]>("/public/business-hours", []);
}

export function getPublicServices() {
  return publicApiFetch<ServiceResponse[]>("/public/services", []);
}

export function getPublicContent() {
  return publicApiFetch<LandingContentResponse[]>("/public/content", []);
}

export function getPublicTestimonials() {
  return publicApiFetch<TestimonialResponse[]>("/public/testimonials", []);
}

export function getPublicGallery() {
  return publicApiFetch<GalleryItemResponse[]>("/public/gallery", []);
}
