import type { PublicSiteData } from "@/lib/public-site";

type SiteFooterProps = {
  siteData: PublicSiteData;
};

export function SiteFooter({ siteData }: Readonly<SiteFooterProps>) {
  const { businessProfile, content } = siteData;

  return (
    <footer className="mt-12 bg-[var(--surface-inverse)] px-4 py-8 text-[var(--text-on-dark)]/85 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 text-sm md:grid-cols-3">
        <div className="space-y-3">
          <p className="text-base font-semibold text-white">Jeni&apos;s Lashes & Brows</p>
          <p className="leading-6 text-[var(--text-subtle)]">
            Cejas y pestanas en La Habana con atencion cuidada, agenda por WhatsApp y
            servicios en estudio o domicilio.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            Contacto
          </p>
          <p>{businessProfile.phoneWhatsapp}</p>
          <p className="leading-6 text-[var(--text-subtle)]">{content.address}</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            Horario base
          </p>
          <p>{content.schedule}</p>
          <p className="text-[var(--text-subtle)]">Contenido editable y publicacion inmediata desde CMS.</p>
        </div>
      </div>
    </footer>
  );
}
