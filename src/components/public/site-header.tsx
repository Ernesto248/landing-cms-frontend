import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { createWhatsAppUrl } from "@/lib/whatsapp";

type SiteHeaderProps = {
  whatsappNumber: string;
  whatsappMessage: string;
};

const navigation = [
  { href: "#galeria", label: "Galeria" },
  { href: "#servicios", label: "Servicios" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader({ whatsappNumber, whatsappMessage }: Readonly<SiteHeaderProps>) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="max-w-[10rem] text-sm font-semibold tracking-[-0.02em] text-[var(--text)] sm:max-w-none">
          Jeni&apos;s Lashes & Brows
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-[var(--text-muted)] md:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[var(--text)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            href={createWhatsAppUrl("header", whatsappMessage, whatsappNumber)}
            target="_blank"
            rel="noreferrer"
          >
            Reservar
          </a>
        </div>
      </div>
    </header>
  );
}
