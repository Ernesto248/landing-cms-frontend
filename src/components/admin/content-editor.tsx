"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import {
  createAdminTestimonial,
  deleteAdminGalleryItem,
  getAdminBusinessProfile,
  getAdminGallery,
  getAdminLandingContent,
  getAdminServices,
  getAdminTestimonials,
  updateAdminBusinessProfile,
  updateAdminGalleryItem,
  updateAdminTestimonial,
  uploadAdminGalleryImage,
  uploadAdminHeroImage,
  upsertAdminLandingContent,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type {
  BusinessProfileResponse,
  GalleryItemResponse,
  LandingContentResponse,
  ServiceResponse,
  TestimonialResponse,
} from "@/lib/api/types";
import { defaultCmsContent, type CmsContent } from "@/lib/cms-content";
import {
  businessHours as fallbackBusinessHours,
  businessProfile as fallbackBusinessProfile,
  galleryItems as fallbackGalleryItems,
  testimonials as fallbackTestimonials,
} from "@/lib/site-content";

type SaveState = "idle" | "saving" | "saved" | "error";

const MAX_GALLERY_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_GALLERY_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type EditorSection = "Hero" | "Servicios" | "Galeria" | "Testimonios" | "WhatsApp" | "Logistica";

type EditableTestimonial = {
  id: string | null;
  clientName: string;
  text: string;
  rating: number;
  isFeatured: boolean;
  sortOrder: number;
};

type EditableGalleryItem = {
  id: string;
  title: string;
  serviceName: string;
  serviceId: string | null;
  description: string;
  publicUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

type EditorState = {
  content: CmsContent;
  businessProfile: BusinessProfileResponse | null;
  testimonials: EditableTestimonial[];
  galleryItems: EditableGalleryItem[];
};

const sections: EditorSection[] = [
  "Hero",
  "Servicios",
  "Galeria",
  "Testimonios",
  "WhatsApp",
  "Logistica",
];

function mapGalleryContentItems(galleryItems: EditableGalleryItem[]) {
  return galleryItems.map((item, index) => {
    const fallbackVisual = fallbackGalleryItems[index % fallbackGalleryItems.length];

    return {
      slug: item.id,
      title: item.title,
      serviceName: item.serviceName,
      description: item.description,
      tone: fallbackVisual?.tone ?? "rose",
      size: fallbackVisual?.size ?? "medium",
    };
  });
}

function normalizeNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readJsonText(record: LandingContentResponse | undefined, key: string) {
  const value = record?.jsonValue?.[key];
  return typeof value === "string" ? value : null;
}

function mapEditorState(
  landingContent: LandingContentResponse[],
  businessProfile: BusinessProfileResponse | null,
  testimonials: TestimonialResponse[],
  gallery: GalleryItemResponse[],
): EditorState {
  const heroRecord = landingContent.find((entry) => entry.contentKey === "hero");
  const servicesRecord = landingContent.find((entry) => entry.contentKey === "services");
  const galleryRecord = landingContent.find((entry) => entry.contentKey === "gallery");
  const whatsappRecord = landingContent.find((entry) => entry.contentKey === "whatsapp");
  const logisticsRecord = landingContent.find((entry) => entry.contentKey === "logistics");

  return {
    content: {
      ...defaultCmsContent,
      heroEyebrow:
        readJsonText(heroRecord, "heroEyebrow") ?? heroRecord?.subtitle ?? defaultCmsContent.heroEyebrow,
      heroTitle: readJsonText(heroRecord, "heroTitle") ?? heroRecord?.title ?? defaultCmsContent.heroTitle,
      heroDescription:
        readJsonText(heroRecord, "heroDescription") ??
        heroRecord?.body ??
        businessProfile?.description ??
        defaultCmsContent.heroDescription,
      heroBackgroundUrl: readJsonText(heroRecord, "heroBackgroundUrl") ?? defaultCmsContent.heroBackgroundUrl,
      servicesIntro:
        readJsonText(servicesRecord, "servicesIntro") ??
        servicesRecord?.body ??
        defaultCmsContent.servicesIntro,
      galleryIntro:
        readJsonText(galleryRecord, "galleryIntro") ??
        galleryRecord?.body ??
        defaultCmsContent.galleryIntro,
      whatsappMessage:
        readJsonText(whatsappRecord, "whatsappMessage") ??
        whatsappRecord?.body ??
        defaultCmsContent.whatsappMessage,
      address:
        readJsonText(logisticsRecord, "address") ??
        logisticsRecord?.title ??
        businessProfile?.addressLine ??
        fallbackBusinessProfile.addressLine,
      schedule:
        readJsonText(logisticsRecord, "schedule") ??
        logisticsRecord?.subtitle ??
        defaultCmsContent.schedule,
      testimonials:
        testimonials.length
          ? testimonials.map((testimonial) => ({
              clientName: testimonial.clientName,
              text: testimonial.text,
            }))
          : fallbackTestimonials,
      galleryItems: gallery.length
        ? mapGalleryContentItems(
            gallery.map((item) => ({
              id: item.id,
              title: item.caption ?? "Sin titulo",
              serviceName: item.serviceName ?? item.altText ?? "Galeria",
              serviceId: item.serviceId,
              description: item.altText ?? item.caption ?? "Resultado reciente",
              publicUrl: item.publicUrl,
              sortOrder: item.sortOrder,
              isActive: item.isActive,
            })),
          )
        : [],
    },
    businessProfile,
    testimonials: testimonials.length
      ? testimonials.map((testimonial) => ({
          id: testimonial.id,
          clientName: testimonial.clientName,
          text: testimonial.text,
          rating: testimonial.rating ?? 5,
          isFeatured: testimonial.isFeatured,
          sortOrder: testimonial.sortOrder,
        }))
      : fallbackTestimonials.map((testimonial, index) => ({
          id: null,
          clientName: testimonial.clientName,
          text: testimonial.text,
          rating: 5,
          isFeatured: true,
          sortOrder: index,
        })),
    galleryItems: gallery.length
      ? gallery.map((item) => ({
          id: item.id,
          title: item.caption ?? "Sin titulo",
          serviceName: item.serviceName ?? item.altText ?? "Galeria",
          serviceId: item.serviceId,
          description: item.altText ?? item.caption ?? "Resultado reciente",
          publicUrl: item.publicUrl,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        }))
      : [],
  };
}

export function ContentEditor() {
  const { accessToken, status } = useAdminSession();
  const [openSection, setOpenSection] = useState<EditorSection | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [pendingGalleryServiceId, setPendingGalleryServiceId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    content: defaultCmsContent,
    businessProfile: null,
    testimonials: fallbackTestimonials.map((testimonial, index) => ({
      id: null,
      clientName: testimonial.clientName,
      text: testimonial.text,
      rating: 5,
      isFeatured: true,
      sortOrder: index,
    })),
    galleryItems: [],
  });

  useEffect(() => {
    if (!accessToken || status !== "authenticated") {
      return;
    }

    const sessionAccessToken = accessToken;
    let isMounted = true;

    async function loadCms() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [businessProfile, landingContent, testimonials, gallery, svc] = await Promise.all([
          getAdminBusinessProfile(sessionAccessToken),
          getAdminLandingContent(sessionAccessToken),
          getAdminTestimonials(sessionAccessToken),
          getAdminGallery(sessionAccessToken),
          getAdminServices(sessionAccessToken),
        ]);

        if (!isMounted) {
          return;
        }

        setServices(svc);

        setEditorState(mapEditorState(landingContent, businessProfile, testimonials, gallery));
        setSaveState("idle");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("No se pudo cargar el CMS.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCms();

    return () => {
      isMounted = false;
    };
  }, [accessToken, status]);

  const content = editorState.content;

  const featuredGalleryPreview = useMemo(() => editorState.galleryItems.slice(0, 4), [editorState.galleryItems]);

  const logisticsSchedulePreview = useMemo(() => {
    return content.schedule || fallbackBusinessHours.map((entry) => `${entry.day}: ${entry.hours}`).join(" · ");
  }, [content.schedule]);

  function markSaved() {
    setSaveState("saved");
    setErrorMessage("");
  }

  function SavingSpinner() {
    return (
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
      />
    );
  }

  function markError(error: unknown, fallbackMessage: string) {
    setSaveState("error");
    if (error instanceof ApiError) {
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage(fallbackMessage);
  }

  function updateField<Field extends keyof CmsContent>(field: Field, value: CmsContent[Field]) {
    setEditorState((current) => ({
      ...current,
      content: { ...current.content, [field]: value },
    }));
    setSaveState("idle");
  }

  function updateTestimonial(index: number, field: keyof EditableTestimonial, value: string | number | boolean) {
    setEditorState((current) => ({
      ...current,
      testimonials: current.testimonials.map((testimonial, currentIndex) =>
        currentIndex === index ? { ...testimonial, [field]: value } : testimonial,
      ),
      content: {
        ...current.content,
        testimonials: current.testimonials.map((testimonial, currentIndex) => {
          const next = currentIndex === index ? { ...testimonial, [field]: value } : testimonial;
          return { clientName: next.clientName, text: next.text };
        }),
      },
    }));
    setSaveState("idle");
  }

  function updateGalleryItem(index: number, field: keyof EditableGalleryItem, value: string | number | boolean) {
    setEditorState((current) => ({
      ...current,
      galleryItems: current.galleryItems.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
      content: {
        ...current.content,
        galleryItems: mapGalleryContentItems(
          current.galleryItems.map((item, currentIndex) =>
            currentIndex === index ? { ...item, [field]: value } : item,
          ),
        ),
      },
    }));
    setSaveState("idle");
  }

  function openGalleryPicker(index: number | null) {
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.dataset.index = index === null ? "new" : String(index);
    fileInputRef.current.click();
  }

  function openHeroPicker() {
    heroFileInputRef.current?.click();
  }

  async function uploadHeroImage(file: File) {
    if (!accessToken) {
      return;
    }

    if (!ALLOWED_GALLERY_FILE_TYPES.has(file.type)) {
      setErrorMessage("Solo se admiten imagenes JPEG, PNG o WEBP.");
      return;
    }

    if (file.size > MAX_GALLERY_FILE_SIZE_BYTES) {
      setErrorMessage("La imagen excede el limite de 10MB.");
      return;
    }

    setUploadingIndex(-1);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("heroEyebrow", content.heroEyebrow);
      formData.append("heroTitle", content.heroTitle);
      formData.append("heroDescription", content.heroDescription);

      const updatedHero = await uploadAdminHeroImage(accessToken, formData);
      const heroBackgroundUrl = readJsonText(updatedHero, "heroBackgroundUrl");

      setEditorState((current) => ({
        ...current,
        content: {
          ...current.content,
          heroBackgroundUrl,
        },
      }));
      setSaveState("saved");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("No se pudo subir la imagen del hero.");
      }
    } finally {
      setUploadingIndex(null);
    }
  }

  async function uploadGalleryImage(index: number, file: File) {
    if (!accessToken) {
      return;
    }

    if (!ALLOWED_GALLERY_FILE_TYPES.has(file.type)) {
      setErrorMessage("Solo se admiten imagenes JPEG, PNG o WEBP.");
      return;
    }

    if (file.size > MAX_GALLERY_FILE_SIZE_BYTES) {
      setErrorMessage("La imagen excede el limite de 10MB.");
      return;
    }

    const sessionAccessToken = accessToken;
    setUploadingIndex(index);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sortOrder", String(index));
      formData.append("altText", editorState.galleryItems[index]?.serviceName ?? "Galeria");
      formData.append("caption", editorState.galleryItems[index]?.title ?? "Sin titulo");
      const sid = editorState.galleryItems[index]?.serviceId ?? pendingGalleryServiceId;
      if (sid) formData.append("serviceId", sid);

      const uploaded = await uploadAdminGalleryImage(sessionAccessToken, formData);

      setEditorState((current) => {
        const existingItem = current.galleryItems[index];
        const nextItems = [...current.galleryItems];
        const nextItem = {
          id: uploaded.id,
          title: uploaded.caption ?? existingItem?.title ?? "Sin titulo",
          serviceName: uploaded.serviceName ?? existingItem?.serviceName ?? "Galeria",
          serviceId: uploaded.serviceId ?? existingItem?.serviceId ?? (sid || null),
          description:
            existingItem?.description ?? uploaded.altText ?? uploaded.caption ?? "Resultado reciente",
          publicUrl: uploaded.publicUrl,
          sortOrder: uploaded.sortOrder,
          isActive: uploaded.isActive,
        };

        if (existingItem) {
          nextItems[index] = nextItem;
        } else {
          nextItems.push(nextItem);
        }

        return {
          ...current,
          galleryItems: nextItems,
          content: {
            ...current.content,
            galleryItems: mapGalleryContentItems(nextItems),
          },
        };
      });

      setSaveState("saved");
      setErrorMessage("");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("No se pudo subir la imagen.");
      }
    } finally {
      setUploadingIndex(null);
    }
  }

  async function removeGalleryItem(itemId: string, index: number) {
    if (!accessToken) {
      setEditorState((current) => ({
        ...current,
        galleryItems: current.galleryItems.filter((_, i) => i !== index),
        content: {
          ...current.content,
          galleryItems: mapGalleryContentItems(current.galleryItems.filter((_, i) => i !== index)),
        },
      }));
      return;
    }

    const sessionAccessToken = accessToken;
    setErrorMessage("");

    try {
      await deleteAdminGalleryItem(sessionAccessToken, itemId);
      setEditorState((current) => ({
        ...current,
        galleryItems: current.galleryItems.filter((item) => item.id !== itemId),
        content: {
          ...current.content,
          galleryItems: mapGalleryContentItems(current.galleryItems.filter((item) => item.id !== itemId)),
        },
      }));
      setSaveState("saved");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("No se pudo eliminar la imagen.");
      }
    }
  }

  async function saveLandingRecord(
    contentKey: string,
    payload: {
      title?: string | null;
      subtitle?: string | null;
      body?: string | null;
      jsonValue?: Record<string, unknown> | null;
    },
  ) {
    if (!accessToken) {
      return;
    }

    const sessionAccessToken = accessToken;

    await upsertAdminLandingContent(sessionAccessToken, {
      contentKey,
      title: payload.title ?? null,
      subtitle: payload.subtitle ?? null,
      body: payload.body ?? null,
      jsonValue: payload.jsonValue ?? null,
    });
  }

  async function saveSection(section: EditorSection) {
    if (!accessToken) {
      return;
    }

    const sessionAccessToken = accessToken;
    setSaveState("saving");
    setErrorMessage("");

    try {
      if (section === "Hero") {
        await saveLandingRecord("hero", {
          title: content.heroTitle,
          subtitle: content.heroEyebrow,
          body: content.heroDescription,
          jsonValue: {
            heroEyebrow: content.heroEyebrow,
            heroTitle: content.heroTitle,
            heroDescription: content.heroDescription,
            heroBackgroundUrl: content.heroBackgroundUrl,
          },
        });
      }

      if (section === "Servicios") {
        await saveLandingRecord("services", {
          title: "Servicios",
          body: content.servicesIntro,
          jsonValue: { servicesIntro: content.servicesIntro },
        });
      }

      if (section === "Galeria") {
        await saveLandingRecord("gallery", {
          title: "Galeria",
          body: content.galleryIntro,
          jsonValue: { galleryIntro: content.galleryIntro },
        });

        await Promise.all(
          editorState.galleryItems.map((item) =>
            updateAdminGalleryItem(sessionAccessToken, item.id, {
              altText: normalizeNullable(item.serviceName || item.description),
              caption: normalizeNullable(item.title),
              sortOrder: item.sortOrder,
              isActive: item.isActive,
              serviceId: item.serviceId,
            }),
          ),
        );
      }

      if (section === "Testimonios") {
        await Promise.all(
          editorState.testimonials.map((testimonial, index) => {
            const payload = {
              clientName: testimonial.clientName,
              text: testimonial.text,
              rating: testimonial.rating,
              isFeatured: testimonial.isFeatured,
              sortOrder: index,
            };

            return testimonial.id
              ? updateAdminTestimonial(sessionAccessToken, testimonial.id, payload)
              : createAdminTestimonial(sessionAccessToken, payload);
          }),
        );
      }

      if (section === "WhatsApp") {
        await saveLandingRecord("whatsapp", {
          title: "WhatsApp",
          body: content.whatsappMessage,
          jsonValue: { whatsappMessage: content.whatsappMessage },
        });
      }

      if (section === "Logistica") {
        await saveLandingRecord("logistics", {
          title: content.address,
          subtitle: content.schedule,
          jsonValue: {
            address: content.address,
            schedule: content.schedule,
          },
        });

        if (editorState.businessProfile) {
          await updateAdminBusinessProfile(sessionAccessToken, {
            brandName: editorState.businessProfile.brandName,
            tagline: editorState.businessProfile.tagline,
            description: editorState.businessProfile.description,
            phoneWhatsapp: editorState.businessProfile.phoneWhatsapp,
            addressLine: normalizeNullable(content.address),
            city: editorState.businessProfile.city,
            country: editorState.businessProfile.country,
            currencyCode: editorState.businessProfile.currencyCode,
            timezone: editorState.businessProfile.timezone,
            instagramUrl: editorState.businessProfile.instagramUrl,
            facebookUrl: editorState.businessProfile.facebookUrl,
            bookingEnabled: editorState.businessProfile.bookingEnabled,
            supportsHomeService: editorState.businessProfile.supportsHomeService,
            supportsStudioService: editorState.businessProfile.supportsStudioService,
          });
        }
      }

      markSaved();
      setOpenSection((current) => (current === section ? null : current));
    } catch (error) {
      markError(error, "No se pudo guardar esta seccion.");
    }
  }

  function saveLabel() {
    if (saveState === "saving") {
      return "Guardando...";
    }

    if (saveState === "saved") {
      return "Guardado en backend";
    }

    if (saveState === "error") {
      return "Error al guardar";
    }

    return "Sin cambios";
  }

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        Cargando contenido del CMS...
      </div>
    );
  }

  return (
    <main className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-4">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">CMS</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
            Edicion por secciones con backend real.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            El panel ya guarda bloques reales en contenido, testimonios, galeria y perfil del negocio.
          </p>
          <p className="mt-4 rounded-[1.2rem] bg-[var(--surface-muted)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Estado: {saveLabel()}
          </p>
          {errorMessage ? (
            <p className="mt-4 rounded-[1.2rem] bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {errorMessage}
            </p>
          ) : null}
        </article>

        {sections.map((section) => {
          const open = openSection === section;

          return (
            <article
              key={section}
              className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                type="button"
                onClick={() => setOpenSection(open ? null : section)}
              >
                <span className="text-lg font-semibold text-[var(--text)]">{section}</span>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {open ? "Abierto" : "Editar"}
                </span>
              </button>

              {open ? (
                <div className="mt-4 space-y-4">
                  {section === "Hero" ? (
                    <>
                      <input
                        ref={heroFileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadHeroImage(file);
                          }
                          event.target.value = "";
                        }}
                      />

                      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-muted)]">
                        <div className="relative aspect-[16/10] bg-[var(--surface-inverse)]">
                          {content.heroBackgroundUrl ? (
                            <Image
                              src={content.heroBackgroundUrl}
                              alt="Fondo del hero"
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 100vw, 640px"
                            />
                          ) : (
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-70"
                              style={{ backgroundImage: "url('/hero-beauty-bg.svg')" }}
                            />
                          )}
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,25,34,0.16),rgba(33,25,34,0.72))]" />
                          <div className="relative z-10 flex h-full flex-col justify-end p-5 text-white">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                              Fondo del hero
                            </p>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-white/85">
                              Aqui subes una unica imagen para el encabezado principal de la landing.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 p-4">
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
                            type="button"
                            onClick={openHeroPicker}
                            disabled={uploadingIndex !== null}
                          >
                            {uploadingIndex === -1
                              ? "Subiendo..."
                              : content.heroBackgroundUrl
                                ? "Cambiar fondo"
                                : "Subir fondo"}
                          </button>
                          {content.heroBackgroundUrl ? (
                            <a
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text)]"
                              href={content.heroBackgroundUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir imagen
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <label className="block text-sm font-medium text-[var(--text)]">
                        Eyebrow
                        <input
                          className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                          value={content.heroEyebrow}
                          onChange={(event) => updateField("heroEyebrow", event.target.value)}
                        />
                      </label>
                      <label className="block text-sm font-medium text-[var(--text)]">
                        Titulo
                        <textarea
                          className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--border-input)] px-4 py-3"
                          value={content.heroTitle}
                          onChange={(event) => updateField("heroTitle", event.target.value)}
                        />
                      </label>
                      <label className="block text-sm font-medium text-[var(--text)]">
                        Descripcion
                        <textarea
                          className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--border-input)] px-4 py-3"
                          value={content.heroDescription}
                          onChange={(event) => updateField("heroDescription", event.target.value)}
                        />
                      </label>
                    </>
                  ) : null}

                  {section === "Servicios" ? (
                    <label className="block text-sm font-medium text-[var(--text)]">
                      Introduccion de servicios
                      <textarea
                        className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--border-input)] px-4 py-3"
                        value={content.servicesIntro}
                        onChange={(event) => updateField("servicesIntro", event.target.value)}
                      />
                    </label>
                  ) : null}

                  {section === "Galeria" ? (
                    <>
                      <label className="block text-sm font-medium text-[var(--text)]">
                        Introduccion de galeria
                        <textarea
                          className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--border-input)] px-4 py-3"
                          value={content.galleryIntro}
                          onChange={(event) => updateField("galleryIntro", event.target.value)}
                        />
                      </label>

                      <input
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          const indexValue = event.target.dataset.index ?? "new";
                          const index = indexValue === "new" ? editorState.galleryItems.length : Number(indexValue);
                          if (file) {
                            void uploadGalleryImage(index, file);
                          }
                          event.target.value = "";
                        }}
                      />

                      <div className="rounded-[1.5rem] bg-[var(--surface-muted)] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[var(--text)]">Imagenes publicadas</p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {editorState.galleryItems.length
                                ? `${editorState.galleryItems.length} imagen${editorState.galleryItems.length === 1 ? "" : "es"} lista${editorState.galleryItems.length === 1 ? "" : "s"} para la landing.`
                                : "Aun no hay imagenes en la galeria publica."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="h-10 rounded-xl border border-[var(--border-input)] bg-[var(--surface)] px-3 text-sm"
                              value={pendingGalleryServiceId}
                              onChange={(e) => setPendingGalleryServiceId(e.target.value)}
                            >
                              <option value="">Servicio...</option>
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.category} - {s.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                              type="button"
                              onClick={() => openGalleryPicker(null)}
                              disabled={uploadingIndex !== null || !pendingGalleryServiceId}
                            >
                              {uploadingIndex === editorState.galleryItems.length ? "Subiendo..." : "Agregar imagen"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {editorState.galleryItems.length ? (
                        <div className="space-y-4">
                          {editorState.galleryItems.map((item, index) => (
                            <div
                              key={item.id}
                              className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                            >
                              <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
                                <div className="space-y-3">
                                  <div className="relative overflow-hidden rounded-[1.25rem] bg-[var(--surface)] aspect-[4/5]">
                                    {item.publicUrl ? (
                                      <Image
                                        src={item.publicUrl}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 224px"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--text-muted)]">
                                        Sin preview disponible
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                                    <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[var(--success)]">
                                      Subida a Spaces
                                    </span>
                                    <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[var(--text-muted)]">
                                      {item.isActive ? "Visible" : "Oculta"}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--text)]"
                                      type="button"
                                      onClick={() => openGalleryPicker(index)}
                                      disabled={uploadingIndex !== null}
                                    >
                                      {uploadingIndex === index ? "Subiendo..." : "Reemplazar imagen"}
                                    </button>
                                    {item.publicUrl ? (
                                      <a
                                        className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-xs font-semibold text-[var(--text)]"
                                        href={item.publicUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Abrir imagen
                                      </a>
                                    ) : null}
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                                        Item {index + 1}
                                      </p>
                                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                                        Este item ya esta listo para mostrarse en la landing publica.
                                      </p>
                                    </div>
                                    <button
                                      className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--danger-bg)] px-4 text-xs font-semibold text-[var(--danger)]"
                                      type="button"
                                      onClick={() => void removeGalleryItem(item.id, index)}
                                    >
                                      Eliminar
                                    </button>
                                  </div>

                                  <label className="mt-4 block text-sm font-medium text-[var(--text)]">
                                    Titulo
                                    <input
                                      className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4"
                                      value={item.title}
                                      onChange={(event) => updateGalleryItem(index, "title", event.target.value)}
                                    />
                                  </label>
                                  <label className="mt-3 block text-sm font-medium text-[var(--text)]">
                                    Servicio relacionado
                                    <select
                                      className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 text-sm"
                                      value={item.serviceId ?? ""}
                                      onChange={(event) => {
                                        const sid = event.target.value || null;
                                        const svc = services.find((s) => s.id === sid);
                                        setEditorState((current) => ({
                                          ...current,
                                          galleryItems: current.galleryItems.map((gi, i) =>
                                            i === index
                                              ? { ...gi, serviceId: sid, serviceName: svc?.name ?? "" }
                                              : gi,
                                          ),
                                        }));
                                      }}
                                    >
                                      <option value="">Seleccionar servicio</option>
                                      {services.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.category} - {s.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="mt-3 block text-sm font-medium text-[var(--text)]">
                                    Descripcion
                                    <textarea
                                      className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3"
                                      value={item.description}
                                      onChange={(event) => updateGalleryItem(index, "description", event.target.value)}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
                          <p className="text-base font-semibold text-[var(--text)]">Tu galeria esta vacia</p>
                          <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                            Sube la primera imagen para ver el preview aqui y luego comprobarla en la landing.
                          </p>
                          <button
                            className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
                            type="button"
                            onClick={() => openGalleryPicker(null)}
                            disabled={uploadingIndex !== null}
                          >
                            {uploadingIndex === 0 ? "Subiendo..." : "Subir primera imagen"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}

                  {section === "Testimonios" ? (
                    <>
                      {editorState.testimonials.map((testimonial, index) => (
                        <div
                          key={`${testimonial.id ?? "new"}-${index}`}
                          className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                            Testimonio {index + 1}
                          </p>
                          <label className="mt-3 block text-sm font-medium text-[var(--text)]">
                            Testimonio
                            <textarea
                              className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3"
                              value={testimonial.text}
                              onChange={(event) => updateTestimonial(index, "text", event.target.value)}
                            />
                          </label>
                          <label className="mt-3 block text-sm font-medium text-[var(--text)]">
                            Autora
                            <input
                              className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--surface)] px-4"
                              value={testimonial.clientName}
                              onChange={(event) =>
                                updateTestimonial(index, "clientName", event.target.value)
                              }
                            />
                          </label>
                        </div>
                      ))}
                    </>
                  ) : null}

                  {section === "WhatsApp" ? (
                    <label className="block text-sm font-medium text-[var(--text)]">
                      Mensaje CTA principal
                      <textarea
                        className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--border-input)] px-4 py-3"
                        value={content.whatsappMessage}
                        onChange={(event) => updateField("whatsappMessage", event.target.value)}
                      />
                    </label>
                  ) : null}

                  {section === "Logistica" ? (
                    <>
                      <label className="block text-sm font-medium text-[var(--text)]">
                        Direccion publica
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--border-input)] px-4 py-3"
                          value={content.address}
                          onChange={(event) => updateField("address", event.target.value)}
                        />
                      </label>
                      <label className="block text-sm font-medium text-[var(--text)]">
                        Horario base
                        <input
                          className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-input)] px-4"
                          value={content.schedule}
                          onChange={(event) => updateField("schedule", event.target.value)}
                        />
                      </label>
                    </>
                  ) : null}

                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition duration-200 disabled:cursor-wait disabled:opacity-75"
                    type="button"
                    disabled={saveState === "saving"}
                    onClick={() => void saveSection(section)}
                  >
                    {saveState === "saving" ? <SavingSpinner /> : null}
                    {saveState === "saving" ? "Guardando..." : "Guardar seccion"}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section>
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">Preview</p>

          <div className="mt-5 space-y-5">
            <section className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-[var(--surface-inverse)] p-5 text-white">
                {content.heroBackgroundUrl ? (
                  <Image
                    src={content.heroBackgroundUrl}
                    alt="Fondo del hero"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 480px"
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-70"
                    style={{ backgroundImage: "url('/hero-beauty-bg.svg')" }}
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,25,34,0.18),rgba(33,25,34,0.78))]" />
                <div className="relative z-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">{content.heroEyebrow}</p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{content.heroTitle}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/85">{content.heroDescription}</p>
                  <button
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                    type="button"
                  >
                    Agendar por WhatsApp
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                Servicios y galeria
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text)]">{content.servicesIntro}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{content.galleryIntro}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {featuredGalleryPreview.length ? (
                  featuredGalleryPreview.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-[1rem] bg-[var(--surface)] text-sm text-[var(--text)]">
                      <div className="relative aspect-[4/5] bg-[var(--surface-muted)]">
                        {item.publicUrl ? (
                          <Image
                            src={item.publicUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 50vw, 160px"
                          />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                          {item.serviceName}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-[1rem] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
                    La galeria publica se vera aqui en cuanto subas la primera imagen.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-[var(--surface-inverse)] p-5 text-[var(--text-on-dark)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-on-dark)]/85">
                Testimonios destacados
              </p>
              <div className="mt-3 space-y-3">
                {editorState.testimonials.map((testimonial, index) => (
                  <div key={`${testimonial.id ?? "new"}-${index}`}>
                    <p className="text-sm leading-7 text-[var(--text-subtle)]">&ldquo;{testimonial.text}&rdquo;</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-on-dark)]/85">
                      {testimonial.clientName}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-[var(--danger-bg)] p-5 text-[var(--text)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">
                WhatsApp y logistica
              </p>
              <p className="mt-3 text-sm leading-7">Mensaje CTA: {content.whatsappMessage}</p>
              <p className="mt-3 text-sm leading-7">Direccion: {content.address}</p>
              <p className="mt-2 text-sm leading-7">Horario: {logisticsSchedulePreview}</p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}
