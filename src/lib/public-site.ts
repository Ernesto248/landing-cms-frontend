import { defaultCmsContent, type CmsContent, type CmsTestimonial } from "@/lib/cms-content";
import {
  businessHours as fallbackBusinessHours,
  businessProfile as fallbackBusinessProfile,
  galleryItems as fallbackGalleryItems,
  services as fallbackServices,
  type Service,
} from "@/lib/site-content";
import {
  getPublicBusinessHours,
  getPublicBusinessProfile,
  getPublicContent,
  getPublicGallery,
  getPublicServices,
  getPublicTestimonials,
} from "@/lib/api/public";
import type {
  BusinessHourResponse,
  BusinessProfileResponse,
  GalleryItemResponse,
  LandingContentResponse,
  ServiceResponse,
  TestimonialResponse,
} from "@/lib/api/types";

type GalleryTone = "rose" | "sand" | "plum" | "olive";
type GallerySize = "short" | "medium" | "tall";

export type PublicGalleryItem = {
  id: string;
  title: string;
  serviceName: string;
  serviceId: string | null;
  serviceCategory: string | null;
  description: string;
  tone: GalleryTone;
  size: GallerySize;
  imageUrl: string | null;
};

export type PublicBusinessProfile = {
  brandName: string;
  description: string | null;
  phoneWhatsapp: string;
  addressLine: string;
  city: string;
  country: string;
  currencyCode: string;
  supportsHomeService: boolean;
  supportsStudioService: boolean;
};

export type PublicBusinessHour = {
  day: string;
  hours: string;
};

export type PublicSiteData = {
  businessProfile: PublicBusinessProfile;
  businessHours: PublicBusinessHour[];
  services: Service[];
  content: CmsContent;
  testimonials: CmsTestimonial[];
  galleryItems: PublicGalleryItem[];
};

const dayNames = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
] as const;

const galleryTones: GalleryTone[] = ["rose", "sand", "plum", "olive"];
const gallerySizes: GallerySize[] = ["medium", "short", "tall", "medium"];

function formatHour(time: string | null) {
  if (!time) {
    return null;
  }

  return time.slice(0, 5);
}

function formatBusinessHour(entry: BusinessHourResponse): PublicBusinessHour {
  return {
    day: dayNames[Math.max(0, Math.min(dayNames.length - 1, entry.dayOfWeek - 1))],
    hours:
      entry.isClosed || !entry.openTime || !entry.closeTime
        ? "Cerrado"
        : `${formatHour(entry.openTime)} - ${formatHour(entry.closeTime)}`,
  };
}

function mapBusinessProfile(profile: BusinessProfileResponse | null): PublicBusinessProfile {
  return {
    brandName: profile?.brandName ?? fallbackBusinessProfile.brandName,
    description: profile?.description ?? null,
    phoneWhatsapp: profile?.phoneWhatsapp ?? fallbackBusinessProfile.phoneWhatsapp,
    addressLine: profile?.addressLine ?? fallbackBusinessProfile.addressLine,
    city: profile?.city ?? fallbackBusinessProfile.city,
    country: profile?.country ?? fallbackBusinessProfile.country,
    currencyCode: profile?.currencyCode ?? "CUP",
    supportsHomeService: profile?.supportsHomeService ?? true,
    supportsStudioService: profile?.supportsStudioService ?? true,
  };
}

function mapServices(services: ServiceResponse[] | null): Service[] {
  if (!services?.length) {
    return fallbackServices;
  }

  return services.map((service) => ({
    category: service.category,
    name: service.name,
    slug: service.slug,
    description: service.description ?? "",
    basePrice: Number(service.basePrice),
    durationMinutes: service.durationMinutes,
    supportsTouchUp: service.supportsTouchUp,
    touchUpDiscount: service.touchUpDiscount,
  }));
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readJsonText(record: LandingContentResponse | undefined, keys: string[]) {
  const jsonValue = record?.jsonValue;

  if (!jsonValue || typeof jsonValue !== "object") {
    return null;
  }

  for (const key of keys) {
    const value = normalizeText((jsonValue as Record<string, unknown>)[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function findContentRecord(records: LandingContentResponse[] | null, keys: string[]) {
  if (!records?.length) {
    return undefined;
  }

  return records.find((record) => keys.includes(record.contentKey));
}

function buildCmsContent(
  records: LandingContentResponse[] | null,
  profile: PublicBusinessProfile,
  hours: PublicBusinessHour[],
): CmsContent {
  const heroRecord = findContentRecord(records, ["hero", "landing.hero", "home.hero"]);
  const servicesRecord = findContentRecord(records, ["services", "services_intro", "landing.services"]);
  const galleryRecord = findContentRecord(records, ["gallery", "gallery_intro", "landing.gallery"]);
  const whatsappRecord = findContentRecord(records, ["whatsapp", "landing.whatsapp", "contact.whatsapp"]);
  const logisticsRecord = findContentRecord(records, ["logistics", "landing.logistics", "contact.logistics"]);

  return {
    ...defaultCmsContent,
    heroEyebrow:
      readJsonText(heroRecord, ["heroEyebrow", "eyebrow"]) ??
      normalizeText(heroRecord?.subtitle) ??
      defaultCmsContent.heroEyebrow,
    heroTitle:
      readJsonText(heroRecord, ["heroTitle", "title"]) ??
      normalizeText(heroRecord?.title) ??
      defaultCmsContent.heroTitle,
    heroDescription:
      readJsonText(heroRecord, ["heroDescription", "description", "body"]) ??
      normalizeText(heroRecord?.body) ??
      profile.description ??
      defaultCmsContent.heroDescription,
    heroBackgroundUrl:
      readJsonText(heroRecord, ["heroBackgroundUrl", "backgroundImageUrl", "backgroundUrl"]) ??
      defaultCmsContent.heroBackgroundUrl,
    servicesIntro:
      readJsonText(servicesRecord, ["servicesIntro", "body", "description"]) ??
      normalizeText(servicesRecord?.body) ??
      defaultCmsContent.servicesIntro,
    galleryIntro:
      readJsonText(galleryRecord, ["galleryIntro", "body", "description"]) ??
      normalizeText(galleryRecord?.body) ??
      defaultCmsContent.galleryIntro,
    whatsappMessage:
      readJsonText(whatsappRecord, ["whatsappMessage", "message", "body"]) ??
      normalizeText(whatsappRecord?.body) ??
      defaultCmsContent.whatsappMessage,
    address:
      readJsonText(logisticsRecord, ["address", "addressLine"]) ??
      normalizeText(logisticsRecord?.title) ??
      profile.addressLine ??
      defaultCmsContent.address,
    schedule:
      readJsonText(logisticsRecord, ["schedule", "businessHours"]) ??
      normalizeText(logisticsRecord?.subtitle) ??
      summarizeHours(hours) ??
      defaultCmsContent.schedule,
    testimonials: defaultCmsContent.testimonials,
    galleryItems: defaultCmsContent.galleryItems,
  };
}

function summarizeHours(hours: PublicBusinessHour[]) {
  if (!hours.length) {
    return null;
  }

  const mondayToFriday = hours.slice(0, 5);
  const saturday = hours[5];

  if (
    mondayToFriday.length === 5 &&
    mondayToFriday.every((entry) => entry.hours === mondayToFriday[0]?.hours) &&
    saturday
  ) {
    return `Lun - Vie ${mondayToFriday[0]?.hours} · Sab ${saturday.hours}`;
  }

  return hours.map((entry) => `${entry.day}: ${entry.hours}`).join(" · ");
}

function mapTestimonials(testimonials: TestimonialResponse[] | null): CmsTestimonial[] {
  if (!testimonials?.length) {
    return defaultCmsContent.testimonials;
  }

  return testimonials.map((testimonial) => ({
    clientName: testimonial.clientName,
    text: testimonial.text,
  }));
}

function mapGalleryItem(record: GalleryItemResponse, index: number): PublicGalleryItem {
  return {
    id: record.id,
    title: record.caption?.trim() || `Trabajo reciente ${index + 1}`,
    serviceName: record.serviceName || record.altText?.trim() || "Galeria",
    serviceId: record.serviceId,
    serviceCategory: record.serviceCategory,
    description:
      record.altText?.trim() ||
      record.caption?.trim() ||
      "Resultado reciente disponible en la galeria publica.",
    tone: galleryTones[index % galleryTones.length],
    size: gallerySizes[index % gallerySizes.length],
    imageUrl: record.publicUrl,
  };
}

function mapGallery(gallery: GalleryItemResponse[] | null): PublicGalleryItem[] {
  if (!gallery?.length) {
    return fallbackGalleryItems.map((item) => ({
      id: `mock-${item.slug}`,
      title: item.title,
      serviceName: item.serviceName,
      serviceId: null,
      serviceCategory: null,
      description: item.description,
      tone: item.tone,
      size: item.size,
      imageUrl: null,
    }));
  }

  return gallery.map(mapGalleryItem);
}

export async function getPublicSiteData(): Promise<PublicSiteData> {
  const [profileResponse, hoursResponse, servicesResponse, contentResponse, testimonialsResponse, galleryResponse] =
    await Promise.all([
      getPublicBusinessProfile(),
      getPublicBusinessHours(),
      getPublicServices(),
      getPublicContent(),
      getPublicTestimonials(),
      getPublicGallery(),
    ]);

  const businessProfile = mapBusinessProfile(profileResponse);
  const businessHours = hoursResponse?.length
    ? hoursResponse.map(formatBusinessHour)
    : fallbackBusinessHours;
  const services = mapServices(servicesResponse);
  const testimonials = mapTestimonials(testimonialsResponse);
  const galleryItems = mapGallery(galleryResponse);
  const content = {
    ...buildCmsContent(contentResponse, businessProfile, businessHours),
    testimonials,
    galleryItems: galleryItems.map((item) => ({
      slug: item.id,
      title: item.title,
      serviceName: item.serviceName,
      description: item.description,
      tone: item.tone,
      size: item.size,
    })),
  };

  return {
    businessProfile,
    businessHours,
    services,
    content,
    testimonials,
    galleryItems,
  };
}
