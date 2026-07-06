import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { createWhatsAppUrl } from "@/lib/whatsapp";

type SiteHeaderProps = {
  whatsappNumber: string;
  whatsappMessage: string;
};

const navigation = [
  { href: "/", label: "Inicio" },
  { href: "/#galeria", label: "Galeria" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader({ whatsappNumber, whatsappMessage }: Readonly<SiteHeaderProps>) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 max-w-[12rem] items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-[var(--text)] sm:max-w-none"
        >
          <Image
            src="/brand-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-xl"
            priority
          />
          <span className="min-w-0 leading-tight">Jeni&apos;s Lashes & Brows</span>
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
