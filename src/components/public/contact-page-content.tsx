import type { PublicSiteData } from "@/lib/public-site";
import { createWhatsAppUrl } from "@/lib/whatsapp";

type ContactPageContentProps = {
  siteData: PublicSiteData;
};

export function ContactPageContent({ siteData }: Readonly<ContactPageContentProps>) {
  const { businessHours, businessProfile, content } = siteData;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Contacto
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-5xl">
          Agenda directo desde tu telefono.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--text-muted)]">
          Esta pantalla resume el cierre logistico: WhatsApp, direccion publica,
          modalidades y horario base editable desde CMS.
        </p>
      </div>

      <section className="grid gap-4 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-2 sm:p-6">
        <article className="rounded-[1.5rem] bg-[var(--surface-muted)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            WhatsApp
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">
            {businessProfile.phoneWhatsapp}
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{content.whatsappMessage}</p>
          <a
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            href={createWhatsAppUrl(
              "contact-page",
              content.whatsappMessage,
              businessProfile.phoneWhatsapp,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Abrir WhatsApp
          </a>
        </article>

        <article className="rounded-[1.5rem] bg-[var(--danger-bg)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--danger)]">
            Direccion publica
          </p>
          <p className="mt-4 text-xl font-semibold text-[var(--text)]">{content.address}</p>
          <p className="mt-3 text-sm leading-7 text-[#5c4d54]">
            {businessProfile.city}, {businessProfile.country}
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Modalidades
          </p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4">
              <p className="text-base font-semibold text-[var(--text)]">Studio</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                Atencion en estudio con direccion publica y coordinacion manual por WhatsApp.
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--surface-muted)] p-4">
              <p className="text-base font-semibold text-[var(--text)]">Home</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                Disponible con recargo variable segun traslado, definido al confirmar la cita.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            Horario base
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{content.schedule}</p>
          <div className="mt-5 space-y-3">
            {businessHours.map((entry) => (
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
    </main>
  );
}
