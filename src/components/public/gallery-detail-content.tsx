import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { PublicSiteData } from "@/lib/public-site";
import { createWhatsAppUrl } from "@/lib/whatsapp";

const galleryToneClasses = {
  rose: "bg-[var(--danger-bg)] text-[var(--danger)]",
  sand: "bg-[var(--secondary-btn)] text-[#5b5146]",
  plum: "bg-[#d9d1e8] text-[#4d356b]",
  olive: "bg-[#dde3d8] text-[var(--success)]",
};

const gallerySizeClasses = {
  short: "min-h-[18rem]",
  medium: "min-h-[24rem]",
  tall: "min-h-[30rem]",
};

type GalleryDetailContentProps = {
  galleryItemId: string;
  siteData: PublicSiteData;
};

export function GalleryDetailContent({ galleryItemId, siteData }: Readonly<GalleryDetailContentProps>) {
  const item = siteData.galleryItems.find((entry) => entry.id === galleryItemId);

  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/#galeria" className="text-sm font-semibold text-[var(--text-muted)]">
        Volver a la galeria
      </Link>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div
          className={`relative flex overflow-hidden rounded-[2rem] p-6 ${galleryToneClasses[item.tone]} ${gallerySizeClasses[item.size]}`}
        >
          {item.imageUrl ? (
            <>
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 52vw"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,14,20,0.08),rgba(19,14,20,0.78))]" />
            </>
          ) : null}
          <div className="relative z-10 mt-auto space-y-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Resultado visual
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em]">{item.title}</h1>
          </div>
        </div>

        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Servicio relacionado
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)]">
            {item.serviceName}
          </h2>
          <p className="mt-4 text-base leading-8 text-[var(--text-muted)]">{item.description}</p>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Esta ficha ya consume la imagen publica real subida desde el CMS.
          </p>

          <a
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            href={createWhatsAppUrl(
              "gallery-detail",
              `Hola, quiero reservar un servicio como ${item.serviceName}.`,
              siteData.businessProfile.phoneWhatsapp,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Reservar por WhatsApp
          </a>
        </article>
      </section>
    </main>
  );
}
