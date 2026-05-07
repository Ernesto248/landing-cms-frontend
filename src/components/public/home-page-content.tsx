"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminMobileSheet } from "@/components/admin/admin-mobile-sheet";
import { GalleryCarousel } from "@/components/public/gallery-carousel";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { WhatsAppFloat } from "@/components/public/whatsapp-float";
import type { PublicSiteData } from "@/lib/public-site";
import { formatDuration, formatPrice } from "@/lib/site-content";
import { createWhatsAppUrl } from "@/lib/whatsapp";

type HomePageContentProps = {
  siteData: PublicSiteData;
};

export function HomePageContent({ siteData }: Readonly<HomePageContentProps>) {
  const { businessHours, businessProfile, content, galleryItems, services, testimonials } = siteData;
  const displayedTestimonials = testimonials.slice(0, 2);

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
  const [carouselImages, setCarouselImages] = useState<{ url: string; alt: string; title: string }[]>([]);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [showCarousel, setShowCarousel] = useState(false);

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

  function openCarousel(serviceName: string) {
    const serviceImages = galleryByService[serviceName] ?? [];
    setCarouselImages(
      serviceImages.map((img) => ({
        url: img.imageUrl!,
        alt: img.serviceName,
        title: img.title,
      })),
    );
    setCarouselStartIndex(0);
    setShowCarousel(true);
  }

  const servicesByCategory = services.reduce<Record<string, typeof services>>((acc, service) => {
    const category = service.category || "Servicios";
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});
  const categoryEntries = Object.entries(servicesByCategory);

  return (
    <>
      <SiteHeader
        whatsappMessage={content.whatsappMessage}
        whatsappNumber={businessProfile.phoneWhatsapp}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-4 sm:px-6 sm:py-6 lg:gap-14 lg:px-8 lg:py-8">
        <section className="relative min-h-[calc(100svh-5.5rem)] overflow-hidden rounded-[2rem] bg-[var(--surface-inverse)] text-[var(--text-on-dark)] sm:min-h-[calc(100svh-6rem)]">
          {content.heroBackgroundUrl ? (
            <Image
              src={content.heroBackgroundUrl}
              alt="Fondo del hero"
              fill
              className="object-cover opacity-55"
              sizes="100vw"
              priority
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-55"
              style={{ backgroundImage: "url('/hero-beauty-bg.svg')" }}
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,25,34,0.18),rgba(33,25,34,0.78))]" />
          <div className="relative z-10 flex min-h-[calc(100svh-5.5rem)] flex-col p-5 sm:min-h-[calc(100svh-6rem)] sm:p-8 lg:p-10">
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xs text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-on-dark)]/85 sm:text-base">
                  {content.heroEyebrow}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80 sm:text-xs">
                  <span className="rounded-full bg-[var(--surface)]/10 px-3 py-2">{businessProfile.city}</span>
                  <span className="rounded-full bg-[var(--surface)]/10 px-3 py-2">Studio y domicilio</span>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
                <div className="max-w-2xl space-y-5 text-left">
                  <h1 className="max-w-xl text-[2.85rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[4.2rem] lg:text-[5rem]">
                    {content.heroTitle}
                  </h1>
                  <p className="max-w-lg text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                    {content.heroDescription}
                  </p>
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                    <a
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-base font-semibold text-white transition hover:bg-[var(--accent-hover)]"
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
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--surface)]/12 px-5 text-base font-semibold text-white transition hover:bg-[var(--surface)]/20"
                      href="#servicios"
                    >
                      Ver servicios
                    </Link>
                  </div>
                </div>

                <div className="hidden rounded-[1.5rem] border border-white/12 bg-[var(--surface)]/8 p-5 text-sm text-white/85 lg:block">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    Reserva directa
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">{businessProfile.phoneWhatsapp}</p>
                  <p className="mt-3 leading-7">
                    Coordinamos servicio, modalidad y horario por WhatsApp.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2 text-sm text-white/78 sm:flex-row sm:items-center sm:justify-between">
                <p>{content.address}</p>
                <p>{content.schedule}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="galeria" className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Resultados</p>
            <h2 className="max-w-2xl text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              Mira el estilo antes de escribir.
            </h2>
            <p className="max-w-2xl text-[1.02rem] leading-8 text-[var(--text-muted)]">{content.galleryIntro}</p>
          </div>

          {galleryCategories.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {galleryCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`inline-flex h-9 items-center justify-center rounded-2xl px-4 text-xs font-semibold transition sm:text-sm ${
                      activeGalleryCategory === cat
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                    type="button"
                    onClick={() => setActiveGalleryCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {uniqueServiceNames.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {uniqueServiceNames.map((serviceName) => {
                    const coverImage = galleryByService[serviceName]?.[0];
                    if (!coverImage?.imageUrl) return null;

                    return (
                      <button
                        key={serviceName}
                        className="group relative flex aspect-[4/5] overflow-hidden rounded-[1.5rem] transition hover:scale-[1.02]"
                        type="button"
                        onClick={() => openCarousel(serviceName)}
                      >
                        <Image
                          src={coverImage.imageUrl}
                          alt={serviceName}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
                            {coverImage.serviceCategory}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white leading-tight">
                            {serviceName}
                          </p>
                          <p className="mt-1 text-[11px] text-white/60">
                            {galleryByService[serviceName].length} foto{galleryByService[serviceName].length !== 1 ? "s" : ""}
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

        <section id="servicios" className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Servicios</p>
            <h2 className="max-w-2xl text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              Lo esencial para decidir rapido.
            </h2>
            <p className="max-w-2xl text-[1.02rem] leading-8 text-[var(--text-muted)]">{content.servicesIntro}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {categoryEntries.map(([category, categoryServices]) => {
              const featured = categoryServices.slice(0, 2);
              const minPrice = Math.min(...categoryServices.map((s) => s.basePrice));

              return (
                <article key={category} className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">{category}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                        Desde {formatPrice(minPrice)}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {categoryServices.length} servicios
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {featured.map((service) => (
                      <article key={service.slug} className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-[1.02rem] font-semibold text-[var(--text)]">{service.name}</h4>
                            <p className="mt-1 text-[0.96rem] leading-6 text-[var(--text-muted)]">{service.description}</p>
                          </div>
                          <span className="text-sm font-semibold text-[var(--text)]">
                            {formatPrice(service.basePrice)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                          <span className="font-medium text-[var(--danger)]">
                            {formatDuration(service.durationMinutes)}
                          </span>
                          {service.supportsTouchUp ? (
                            <span className="rounded-full bg-[var(--danger-bg)] px-3 py-1 font-semibold text-[var(--danger)]">
                              Retoque: {formatPrice(service.basePrice - (service.touchUpDiscount ?? 500))}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[2rem] bg-[var(--surface-inverse)] p-5 text-[var(--text-on-dark)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-on-dark)]/85">Como funciona</p>
            <ol className="mt-5 space-y-3 text-base leading-7 text-[var(--text-subtle)]">
              <li>1. La clienta escribe por WhatsApp.</li>
              <li>2. Se confirma servicio, modalidad y horario.</li>
              <li>3. La cita se registra manualmente en el dashboard.</li>
            </ol>
          </article>

          <div className="grid gap-4">
            {displayedTestimonials.map((testimonial) => (
              <article
                key={`${testimonial.clientName}-${testimonial.text}`}
                className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <p className="text-[1.02rem] leading-8 text-[var(--text-muted)]">&ldquo;{testimonial.text}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                  {testimonial.clientName}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Ubicacion y modalidad
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
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

          <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">Horario base</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{content.schedule}</p>
            <div className="mt-5 space-y-3">
              {businessHours.slice(0, 3).map((entry) => (
                <div
                  key={entry.day}
                  className="flex items-center justify-between rounded-[1.2rem] bg-[var(--surface-muted)] px-4 py-3 text-sm"
                >
                  <span className="font-medium text-[var(--text)]">{entry.day}</span>
                  <span className="text-[var(--text-muted)]">{entry.hours}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] bg-[var(--surface-inverse)] p-6 text-[var(--text-on-dark)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-on-dark)]/85">CTA final</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-[2rem] font-semibold tracking-[-0.05em] sm:text-4xl">
                Lista para coordinar tu cita por WhatsApp.
              </h2>
              <p className="mt-3 text-[1.02rem] leading-8 text-[var(--text-subtle)]">
                Escríbenos y coordinamos servicio, modalidad y horario contigo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
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

      <AdminMobileSheet open={showCarousel} onClose={() => setShowCarousel(false)}>
        <GalleryCarousel images={carouselImages} startIndex={carouselStartIndex} />
      </AdminMobileSheet>

      <SiteFooter siteData={siteData} />
      <WhatsAppFloat
        message={content.whatsappMessage}
        phoneNumber={businessProfile.phoneWhatsapp}
      />
    </>
  );
}
