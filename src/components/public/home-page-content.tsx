"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronRight, Clock, MapPin, MessageCircle, Sparkles, X } from "lucide-react";

import { AdminMobileSheet } from "@/components/admin/admin-mobile-sheet";
import { MobileDynamicIsland } from "@/components/public/mobile-dynamic-island";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { WhatsAppFloat } from "@/components/public/whatsapp-float";
import type { PublicSiteData } from "@/lib/public-site";
import { formatDuration, formatPrice, type Service } from "@/lib/site-content";
import { createWhatsAppUrl } from "@/lib/whatsapp";

type HomePageContentProps = {
  siteData: PublicSiteData;
};

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HomePageContent({ siteData }: Readonly<HomePageContentProps>) {
  const { businessProfile, content, galleryItems, services } = siteData;
  const pageRef = useRef<HTMLElement>(null);

  const galleryByCategory = useMemo(() => {
    const grouped: Record<string, typeof galleryItems> = {};
    for (const item of galleryItems) {
      if (item.serviceCategory && item.imageUrl) {
        const cat = item.serviceCategory;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }
    }
    return grouped;
  }, [galleryItems]);

  const galleryCategories = useMemo(() => Object.keys(galleryByCategory), [galleryByCategory]);
  const [activeGalleryCategory, setActiveGalleryCategory] = useState<string | null>(
    () => galleryCategories[0] ?? null,
  );
  const [selectedGalleryServiceName, setSelectedGalleryServiceName] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const galleryByService = useMemo(() => {
    if (!activeGalleryCategory) return {};
    const items = galleryByCategory[activeGalleryCategory] ?? [];
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const key = item.serviceName;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return grouped;
  }, [activeGalleryCategory, galleryByCategory]);

  const uniqueServiceNames = useMemo(() => Object.keys(galleryByService), [galleryByService]);
  const selectedGalleryImages = selectedGalleryServiceName ? (galleryByService[selectedGalleryServiceName] ?? []) : [];

  const servicesByCategory = services.reduce<Record<string, typeof services>>((acc, service) => {
    const category = service.category || "Servicios";
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});
  const categoryEntries = Object.entries(servicesByCategory);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        gsap.set("[data-gsap-hidden]", { clearProps: "all" });
        return;
      }

      const mm = gsap.matchMedia();

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-hero-media]", { scale: 1.12, duration: 1.45 })
        .from("[data-hero-reveal]", { y: 30, opacity: 0, duration: 0.85, stagger: 0.09 }, "-=1.05")
        .from("[data-hero-reserve]", { y: 18, opacity: 0, duration: 0.65 }, "-=0.35")
        .from("[data-mobile-island]", { y: 24, opacity: 0, duration: 0.55 }, "-=0.25");

      mm.add("(min-width: 768px)", () => {
        gsap.to("[data-hero-media]", {
          yPercent: 9,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

      });

      gsap.utils.toArray<HTMLElement>("[data-section-reveal]").forEach((section) => {
        gsap.from(section.querySelectorAll("[data-reveal-item]"), {
          y: 28,
          opacity: 0,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-image-reveal]").forEach((frame) => {
        gsap.fromTo(
          frame,
          { clipPath: "inset(0 0 100% 0)" },
          {
            clipPath: "inset(0 0 0% 0)",
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: frame,
              start: "top 82%",
              once: true,
            },
          },
        );
      });

      gsap.from("[data-service-card]", {
        y: 32,
        opacity: 0,
        duration: 0.78,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: "[data-services-grid]",
          start: "top 82%",
          once: true,
        },
      });

      return () => mm.revert();
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      gsap.fromTo(
        "[data-gallery-card]",
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.04,
          onComplete: () => ScrollTrigger.refresh(),
        },
      );
    },
    { dependencies: [activeGalleryCategory], scope: pageRef },
  );

  return (
    <>
      <SiteHeader
        whatsappMessage={content.whatsappMessage}
        whatsappNumber={businessProfile.phoneWhatsapp}
      />

      <main ref={pageRef} className="flex w-full flex-1 flex-col overflow-hidden pb-20 md:pb-0">
        <section
          data-hero
          className="relative min-h-[calc(100svh-4.25rem)] overflow-hidden bg-[var(--surface-inverse)] text-[var(--text-on-dark)]"
        >
          <div data-hero-media className="absolute inset-0 will-change-transform">
            {content.heroBackgroundUrl ? (
              <Image
                src={content.heroBackgroundUrl}
                alt="Fondo del hero"
                fill
                className="object-cover object-[56%_center] opacity-90 sm:object-center sm:opacity-78"
                sizes="100vw"
                priority
              />
            ) : (
              <Image
                src="/hero-beauty-editorial.png"
                alt="Resultado profesional de pestanas y cejas"
                fill
                className="object-cover object-[72%_center] opacity-90 sm:object-[68%_center]"
                sizes="100vw"
                priority
              />
            )}
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,9,13,0.88),rgba(22,15,22,0.56)_48%,rgba(33,25,34,0.16)_78%,rgba(33,25,34,0.34))] sm:bg-[linear-gradient(90deg,rgba(12,9,13,0.94),rgba(22,15,22,0.72)_42%,rgba(33,25,34,0.18)_68%,rgba(33,25,34,0.44))]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,9,13,0.16),rgba(12,9,13,0.04)_28%,rgba(12,9,13,0.86)_100%)] sm:bg-[linear-gradient(180deg,rgba(12,9,13,0.08),transparent_45%,rgba(12,9,13,0.46)_100%)]" />
          <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-[var(--bg)] to-transparent sm:h-32" />
          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4.25rem)] w-full max-w-6xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-8 lg:px-8">
            <div className="grid flex-1 grid-rows-[auto_1fr] gap-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p data-hero-reveal className="max-w-[16rem] text-xs font-semibold uppercase leading-5 tracking-[0.2em] text-[var(--text-on-dark)]/85 sm:max-w-xs sm:text-sm sm:tracking-[0.16em] lg:text-base">
                  {content.heroEyebrow}
                </p>
              </div>

              <div className="grid content-end gap-6 pb-24 sm:gap-8 sm:pb-0 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
                <div className="max-w-3xl space-y-4 text-left sm:space-y-5">
                  <h1 data-hero-reveal className="max-w-[21rem] text-[clamp(2.35rem,12vw,3.35rem)] font-semibold leading-[0.95] text-white [text-wrap:balance] sm:max-w-3xl sm:text-[4rem] lg:text-[4.65rem]">
                    {content.heroTitle}
                  </h1>
                  <div data-hero-reveal className="flex flex-col gap-3 pt-1 sm:max-w-none sm:flex-row">
                    <a
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-base font-semibold text-white shadow-[0_16px_32px_rgba(230,0,35,0.28)] transition hover:bg-[var(--accent-hover)] sm:w-auto"
                      href={createWhatsAppUrl(
                        "hero",
                        content.whatsappMessage,
                        businessProfile.phoneWhatsapp,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Agendar por WhatsApp
                    </a>
                    <Link
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-[var(--surface)]/12 px-5 text-base font-semibold text-white backdrop-blur transition hover:bg-[var(--surface)]/20 sm:w-auto"
                      href="#servicios"
                    >
                      Ver servicios
                    </Link>
                  </div>
                  <p data-hero-reveal className="hidden max-w-md text-sm font-medium leading-6 text-white/74 sm:block">
                    Reserva manual por WhatsApp. Revisamos el servicio, el acabado y el horario antes de confirmar.
                  </p>
                </div>

                <div data-hero-reserve className="hidden border-l border-white/18 pl-5 text-sm text-white/85 lg:block">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    WhatsApp
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">{businessProfile.phoneWhatsapp}</p>
                  <p className="mt-3 leading-7">
                    Conversacion breve, decision clara y cita confirmada manualmente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="galeria" data-section-reveal className="mx-auto w-full max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-5 lg:grid-cols-[0.72fr_1fr] lg:items-end">
            <div className="space-y-3">
              <p data-reveal-item className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Resultados</p>
              <h2 data-reveal-item className="max-w-2xl text-[2rem] font-semibold text-[var(--text)] sm:text-4xl">
              Mira el estilo antes de escribir.
              </h2>
            </div>
            <p data-reveal-item className="max-w-2xl text-[1.02rem] leading-8 text-[var(--text-muted)]">{content.galleryIntro}</p>
          </div>

          {galleryCategories.length > 0 ? (
            <>
              <div data-reveal-item className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                <div className="inline-flex min-w-full gap-2 rounded-[1.65rem] bg-[var(--surface-muted)] p-1 sm:min-w-0">
                {galleryCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`inline-flex h-10 shrink-0 items-center justify-center rounded-[1.3rem] px-4 text-xs font-semibold transition sm:text-sm ${
                      activeGalleryCategory === cat
                        ? "bg-[var(--surface)] text-[var(--text)] shadow-[0_8px_22px_rgba(33,25,34,0.08)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                    type="button"
                    onClick={() => setActiveGalleryCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
                </div>
              </div>

              {uniqueServiceNames.length > 0 ? (
                <div data-gallery-grid className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {uniqueServiceNames.map((serviceName) => {
                    const coverImage = galleryByService[serviceName]?.[0];
                    if (!coverImage?.imageUrl) return null;
                    const imageCount = galleryByService[serviceName].length;

                    return (
                      <button
                        key={serviceName}
                        data-gallery-card
                        data-image-reveal
                        className="group relative aspect-video min-w-0 overflow-hidden rounded-[1.35rem] bg-[var(--surface-muted)] transition hover:scale-[1.01] sm:rounded-[1.5rem]"
                        type="button"
                        onClick={() => setSelectedGalleryServiceName(serviceName)}
                      >
                        <Image
                          src={coverImage.imageUrl}
                          alt={serviceName}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
                            {coverImage.serviceCategory}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white leading-tight">
                            {serviceName}
                          </p>
                          <p className="mt-1 text-[11px] text-white/60">
                            {imageCount} foto{imageCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-[var(--surface-muted)] py-16 text-center">
                  <p className="text-sm text-[var(--text-muted)]">Sube imagenes desde el panel CMS para esta categoria.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-[var(--surface-muted)] py-16 text-center">
              <p className="text-sm text-[var(--text-muted)]">Sube imagenes desde el panel CMS para ver la galeria.</p>
            </div>
          )}
        </section>

        <section id="servicios" data-section-reveal className="mx-auto w-full max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-5 lg:grid-cols-[0.75fr_1fr] lg:items-end">
            <div className="space-y-3">
              <p data-reveal-item className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Servicios</p>
              <h2 data-reveal-item className="max-w-2xl text-[2rem] font-semibold text-[var(--text)] sm:text-4xl">
                Lo esencial para decidir rapido.
              </h2>
            </div>
            <p data-reveal-item className="max-w-2xl text-[1.02rem] leading-8 text-[var(--text-muted)]">{content.servicesIntro}</p>
          </div>

          <div data-services-grid className="space-y-8">
            {categoryEntries.map(([category, categoryServices]) => {
              const minPrice = Math.min(...categoryServices.map((s) => s.basePrice));

              return (
                <section
                  key={category}
                  data-service-card
                  className="grid gap-4 border-t border-[var(--border)] pt-5 lg:grid-cols-[0.32fr_1fr] lg:items-start"
                >
                  <div className="flex items-center justify-between gap-3 lg:block">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">{category}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-[var(--text)]">
                        Desde {formatPrice(minPrice)}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-2xl bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] lg:mt-4 lg:inline-flex">
                      {categoryServices.length} servicios
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-2 lg:gap-4">
                    {categoryServices.map((service) => (
                      <button
                        key={service.slug}
                        className="group flex min-h-[12.5rem] flex-col justify-between rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-[0_14px_34px_rgba(33,25,34,0.06)] transition active:scale-[0.99] hover:-translate-y-0.5 hover:border-[rgba(230,0,35,0.26)] sm:min-h-[15rem] sm:rounded-[1.65rem] sm:p-5"
                        type="button"
                        onClick={() => setSelectedService(service)}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="min-w-0">
                              <h4 className="text-[0.96rem] font-semibold leading-tight text-[var(--text)] sm:text-[1.08rem]">{service.name}</h4>
                              <p className="mt-3 hidden text-[0.96rem] leading-6 text-[var(--text-muted)] sm:block">{service.description}</p>
                            </div>
                            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] transition group-hover:bg-[var(--danger-bg)] group-hover:text-[var(--danger)] sm:flex">
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                            <span className="text-lg font-semibold text-[var(--text)] sm:text-2xl">
                              {formatPrice(service.basePrice)}
                            </span>
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--danger)] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDuration(service.durationMinutes)}
                          </span>
                          </div>
                          {service.supportsTouchUp ? (
                            <p className="rounded-[0.9rem] bg-[var(--danger-bg)] px-2 py-1.5 text-xs font-semibold text-[var(--danger)] sm:rounded-[1rem] sm:px-3 sm:py-2 sm:text-sm">
                              Retoque: {formatPrice(service.basePrice - (service.touchUpDiscount ?? 500))}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section data-section-reveal className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <article data-reveal-item className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Ubicacion y modalidad
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold text-[var(--text)] sm:text-4xl">
              Todo claro antes de reservar.
            </h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Studio</p>
                <p className="mt-2 text-base font-semibold text-[var(--text)]">{content.address}</p>
              </div>
              <div className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Home</p>
                <p className="mt-2 text-base font-semibold text-[var(--text)]">
                  Servicio a domicilio con fee variable segun traslado.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section data-section-reveal className="mx-auto my-12 w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-[var(--surface-inverse)] p-6 text-[var(--text-on-dark)] sm:w-[calc(100%-3rem)] sm:p-8 lg:my-16">
          <p data-reveal-item className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-on-dark)]/85">Reserva por WhatsApp</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 data-reveal-item className="text-[2rem] font-semibold sm:text-4xl">
                Lista para coordinar tu cita por WhatsApp.
              </h2>
              <p data-reveal-item className="mt-3 text-[1.02rem] leading-8 text-[var(--text-subtle)]">
                Escríbenos y coordinamos servicio, modalidad y horario contigo.
              </p>
            </div>

            <div data-reveal-item className="flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(230,0,35,0.24)] transition hover:bg-[var(--accent-hover)]"
                href={createWhatsAppUrl(
                  "footer",
                  content.whatsappMessage,
                  businessProfile.phoneWhatsapp,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Escribir ahora
              </a>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-white/40"
                href="/contacto"
              >
                Ver contacto
              </Link>
            </div>
          </div>
        </section>
      </main>

      <AdminMobileSheet open={selectedGalleryServiceName !== null} onClose={() => setSelectedGalleryServiceName(null)}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Galeria</p>
              <p className="mt-1 truncate text-base font-semibold text-[var(--text)]">
                {selectedGalleryServiceName}
              </p>
            </div>
            <button
              aria-label="Cerrar galeria"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
              type="button"
              onClick={() => setSelectedGalleryServiceName(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {selectedGalleryImages.map((image) => (
              <figure key={image.id} className="overflow-hidden rounded-[1.35rem] bg-[var(--surface-muted)]">
                <div className="relative aspect-video bg-[var(--surface-inverse)]">
                  {image.imageUrl ? (
                    <Image
                      src={image.imageUrl}
                      alt={image.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100vw, 520px"
                    />
                  ) : null}
                </div>
                <figcaption className="p-3">
                  <p className="text-sm font-semibold text-[var(--text)]">{image.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{image.serviceName}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </AdminMobileSheet>

      <AdminMobileSheet open={selectedService !== null} onClose={() => setSelectedService(null)}>
        {selectedService ? (
          <div className="flex h-full flex-col overflow-y-auto pb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {selectedService.category}
              </p>
              <button
                aria-label="Cerrar detalle de servicio"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
                type="button"
                onClick={() => setSelectedService(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="text-3xl font-semibold leading-[0.98] text-[var(--text)]">
                  {selectedService.name}
                </h3>
                <p className="mt-3 text-base leading-7 text-[var(--text-muted)]">
                  {selectedService.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.35rem] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                    Precio
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--text)]">
                    {formatPrice(selectedService.basePrice)}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                    Duracion
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--text)]">
                    {formatDuration(selectedService.durationMinutes)}
                  </p>
                </div>
              </div>

              {selectedService.supportsTouchUp ? (
                <div className="rounded-[1.35rem] bg-[var(--danger-bg)] p-4 text-[var(--danger)]">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Retoque disponible
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatPrice(selectedService.basePrice - (selectedService.touchUpDiscount ?? 500))}
                  </p>
                </div>
              ) : null}

              <div className="rounded-[1.35rem] border border-[var(--border)] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                  <MapPin className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                  Studio o domicilio
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  En domicilio se confirma un fee variable segun traslado antes de reservar.
                </p>
              </div>
            </div>

            <div className="mt-auto pt-5">
              <a
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(230,0,35,0.24)] transition hover:bg-[var(--accent-hover)]"
                href={createWhatsAppUrl(
                  "service-detail",
                  `Hola, quiero consultar por ${selectedService.name}.`,
                  businessProfile.phoneWhatsapp,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        ) : null}
      </AdminMobileSheet>

      <SiteFooter siteData={siteData} />
      {selectedGalleryServiceName === null && selectedService === null ? (
        <MobileDynamicIsland
          message={content.whatsappMessage}
          phoneNumber={businessProfile.phoneWhatsapp}
        />
      ) : null}
      <WhatsAppFloat
        message={content.whatsappMessage}
        phoneNumber={businessProfile.phoneWhatsapp}
      />
    </>
  );
}
