export type ServiceCategory = "Brows" | "Lashes";

export type Service = {
  category: ServiceCategory;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  supportsTouchUp: boolean;
};

export type GalleryItem = {
  slug: string;
  title: string;
  serviceName: string;
  description: string;
  tone: "rose" | "sand" | "plum" | "olive";
  size: "short" | "medium" | "tall";
};

export const businessProfile = {
  brandName: "Jeni's Lashes & Brows",
  city: "La Habana",
  country: "Cuba",
  addressLine: "Cornelio Porro #172 altos entre 5 y 6 Garrido",
  phoneWhatsapp: "55902529",
};

export const services: Service[] = [
  {
    category: "Brows",
    name: "Diseno de cejas con cera",
    slug: "diseno-cejas-cera",
    description: "Perfilado limpio y rapido para mantener la forma natural.",
    basePrice: 300,
    durationMinutes: 15,
    supportsTouchUp: false,
  },
  {
    category: "Brows",
    name: "Aplicacion de tinte henna",
    slug: "tinte-henna",
    description: "Realce suave del color para definir mejor la mirada.",
    basePrice: 300,
    durationMinutes: 15,
    supportsTouchUp: false,
  },
  {
    category: "Brows",
    name: "Depilacion de bozo",
    slug: "depilacion-bozo",
    description: "Servicio rapido para acabado pulcro en el rostro.",
    basePrice: 150,
    durationMinutes: 10,
    supportsTouchUp: false,
  },
  {
    category: "Brows",
    name: "Laminado de cejas",
    slug: "laminado-cejas",
    description: "Diseno estructurado con fijacion para un look prolijo y duradero.",
    basePrice: 1400,
    durationMinutes: 60,
    supportsTouchUp: false,
  },
  {
    category: "Lashes",
    name: "Aplicacion de Volumen 2D",
    slug: "volumen-2d",
    description: "Volumen ligero con definicion pareja en toda la linea.",
    basePrice: 3000,
    durationMinutes: 150,
    supportsTouchUp: true,
  },
  {
    category: "Lashes",
    name: "Aplicacion de Volumen 3D",
    slug: "volumen-3d",
    description: "Cobertura mas densa para una mirada marcada pero elegante.",
    basePrice: 3300,
    durationMinutes: 150,
    supportsTouchUp: true,
  },
  {
    category: "Lashes",
    name: "Aplicacion de Volumen 4D",
    slug: "volumen-4d",
    description: "Resultado mas intenso para clientas que buscan impacto visual.",
    basePrice: 3500,
    durationMinutes: 150,
    supportsTouchUp: true,
  },
  {
    category: "Lashes",
    name: "Aplicacion de Clasicas",
    slug: "clasicas",
    description: "Extensiones una a una para un acabado natural y definido.",
    basePrice: 3000,
    durationMinutes: 150,
    supportsTouchUp: true,
  },
  {
    category: "Lashes",
    name: "Lifting de pestanas",
    slug: "lifting-pestanas",
    description: "Curvatura y levantamiento para destacar tus pestanas naturales.",
    basePrice: 1700,
    durationMinutes: 60,
    supportsTouchUp: false,
  },
];

export const businessHours = [
  { day: "Lunes", hours: "9:00 - 17:00" },
  { day: "Martes", hours: "9:00 - 17:00" },
  { day: "Miercoles", hours: "9:00 - 17:00" },
  { day: "Jueves", hours: "9:00 - 17:00" },
  { day: "Viernes", hours: "9:00 - 17:00" },
  { day: "Sabado", hours: "9:00 - 14:00" },
  { day: "Domingo", hours: "Cerrado" },
];

export const testimonials = [
  {
    clientName: "Mariela",
    text: "Muy buen trato, trabajo prolijo y resultado natural. La reserva por WhatsApp fue rapidisima.",
  },
  {
    clientName: "Yanelis",
    text: "Me encanto el volumen y como explico cada paso. La atencion fue super cuidada.",
  },
];

export const galleryItems: GalleryItem[] = [
  {
    slug: "cejas-naturales",
    title: "Acabado limpio y natural",
    serviceName: "Diseno de cejas con cera",
    description: "Perfilado sutil para realzar la forma natural sin endurecer la expresion.",
    tone: "rose",
    size: "medium",
  },
  {
    slug: "henna-suave",
    title: "Definicion suave con henna",
    serviceName: "Aplicacion de tinte henna",
    description: "Color delicado para una mirada mas definida y uniforme.",
    tone: "sand",
    size: "short",
  },
  {
    slug: "volumen-elegante",
    title: "Volumen con presencia elegante",
    serviceName: "Aplicacion de Volumen 3D",
    description: "Densidad balanceada para un resultado intenso, femenino y prolijo.",
    tone: "plum",
    size: "tall",
  },
  {
    slug: "clasicas-limpias",
    title: "Clasicas de efecto pulido",
    serviceName: "Aplicacion de Clasicas",
    description: "Una a una para un resultado limpio que se siente comodo todo el dia.",
    tone: "olive",
    size: "medium",
  },
  {
    slug: "laminado-ordenado",
    title: "Laminado con estructura",
    serviceName: "Laminado de cejas",
    description: "Cejas peinadas y definidas con una forma mas ordenada y duradera.",
    tone: "sand",
    size: "tall",
  },
  {
    slug: "lifting-ligero",
    title: "Lifting luminoso",
    serviceName: "Lifting de pestanas",
    description: "Curvatura suave para destacar la pestana natural con un look fresco.",
    tone: "rose",
    size: "short",
  },
];

export function formatPrice(value: number) {
  return `${value.toFixed(0)} CUP`;
}

export function formatDuration(value: number) {
  return `${value} min`;
}
