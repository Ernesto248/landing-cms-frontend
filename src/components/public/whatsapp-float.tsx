import { createWhatsAppUrl } from "@/lib/whatsapp";

type WhatsAppFloatProps = {
  message: string;
  phoneNumber: string;
};

export function WhatsAppFloat({ message, phoneNumber }: Readonly<WhatsAppFloatProps>) {

  return (
    <a
      className="fixed bottom-5 right-4 z-50 inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.94)] px-4 text-sm font-semibold text-[var(--text)] shadow-[0_12px_30px_rgba(33,25,34,0.14)] transition hover:border-[rgba(33,25,34,0.2)] sm:bottom-6 sm:right-6"
      href={createWhatsAppUrl("floating", message, phoneNumber)}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir WhatsApp"
    >
      WhatsApp
    </a>
  );
}
