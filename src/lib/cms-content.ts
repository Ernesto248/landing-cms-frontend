import { galleryItems, testimonials, type GalleryItem } from "@/lib/site-content";

export type CmsTestimonial = {
  clientName: string;
  text: string;
};

export type CmsGalleryItem = Pick<
  GalleryItem,
  "slug" | "title" | "serviceName" | "description" | "tone" | "size"
>;

export type CmsContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroBackgroundUrl: string | null;
  servicesIntro: string;
  galleryIntro: string;
  testimonials: CmsTestimonial[];
  galleryItems: CmsGalleryItem[];
  whatsappMessage: string;
  address: string;
  schedule: string;
};

export const CMS_CONTENT_STORAGE_KEY = "jeni-cms-content";

export const defaultCmsContent: CmsContent = {
  heroEyebrow: "Mirada prolija, natural y cuidada",
  heroTitle: "Cejas y pestanas con un acabado delicado que se ve bien de cerca.",
  heroDescription:
    "Agenda directo por WhatsApp y coordina tu servicio segun modalidad, horario base y resultado que quieras lograr.",
  heroBackgroundUrl: null,
  servicesIntro:
    "Precios claros, tiempos visibles y opciones pensadas para que elijas sin vueltas antes de escribir.",
  galleryIntro: "Explora acabados recientes por tipo de servicio y usa las fotos como referencia para tu cita.",
  testimonials,
  galleryItems,
  whatsappMessage: "Hola, quiero agendar una cita en Jeni's Lashes & Brows.",
  address: "Cornelio Porro #172 altos entre 5 y 6 Garrido",
  schedule: "Lun - Vie 9:00 - 17:00 · Sab 9:00 - 14:00",
};

export function normalizeCmsContent(content?: Partial<CmsContent> | null): CmsContent {
  return {
    ...defaultCmsContent,
    ...content,
  };
}

export function parseCmsContent(raw: string | null): CmsContent {
  if (!raw) {
    return defaultCmsContent;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CmsContent>;
    return normalizeCmsContent(parsed);
  } catch {
    return defaultCmsContent;
  }
}
