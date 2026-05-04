const COUNTRY_CODE = "53";
const LOCAL_NUMBER = "55902529";
const DEFAULT_MESSAGE = "Hola, quiero agendar una cita en Jeni's Lashes & Brows.";

const ctaMessages: Record<string, string> = {
  header: DEFAULT_MESSAGE,
  hero: DEFAULT_MESSAGE,
  panel: "Hola, quiero consultar disponibilidad y servicios.",
  footer: "Hola, quiero reservar una cita.",
  floating: DEFAULT_MESSAGE,
  "contact-page": "Hola, quiero informacion sobre servicios y horarios.",
};

export function createWhatsAppUrl(
  cta: keyof typeof ctaMessages | string,
  messageOverride?: string,
  phoneNumber = LOCAL_NUMBER,
) {
  const message = messageOverride ?? ctaMessages[cta] ?? DEFAULT_MESSAGE;

  return `https://wa.me/${COUNTRY_CODE}${phoneNumber}?text=${encodeURIComponent(message)}`;
}
