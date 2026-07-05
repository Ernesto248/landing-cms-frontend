"use client";

import Link from "next/link";
import { Images, MessageCircle, Scissors, Sparkles } from "lucide-react";

import { createWhatsAppUrl } from "@/lib/whatsapp";

type MobileDynamicIslandProps = {
  message: string;
  phoneNumber: string;
};

const navItems = [
  { href: "#galeria", label: "Galeria", icon: Images },
  { href: "#servicios", label: "Servicios", icon: Scissors },
  { href: "/contacto", label: "Contacto", icon: Sparkles },
];

export function MobileDynamicIsland({ message, phoneNumber }: Readonly<MobileDynamicIslandProps>) {
  return (
    <nav
      data-mobile-island
      aria-label="Navegacion principal movil"
      className="fixed inset-x-0 bottom-[calc(0.7rem+env(safe-area-inset-bottom))] z-50 px-3 md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-[23rem] items-center gap-1.5 rounded-[2rem] border border-white/12 bg-[rgba(18,14,18,0.86)] p-1.5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const className =
            "flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.45rem] text-[10px] font-semibold leading-none text-white/72 transition active:scale-95 hover:bg-white/10 hover:text-white";

          if (item.href.startsWith("/")) {
            return (
              <Link key={item.href} href={item.href} className={className}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <a key={item.href} href={item.href} className={className}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}

        <a
          className="flex h-12 w-[5.9rem] shrink-0 items-center justify-center gap-1.5 rounded-[1.45rem] bg-[var(--accent)] px-3 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(230,0,35,0.32)] transition active:scale-95"
          href={createWhatsAppUrl("mobile-island", message, phoneNumber)}
          target="_blank"
          rel="noreferrer"
          aria-label="Reservar por WhatsApp"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>Reservar</span>
        </a>
      </div>
    </nav>
  );
}
