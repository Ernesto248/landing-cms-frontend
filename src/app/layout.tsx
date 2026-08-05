import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sileo";
import { Analytics } from "@vercel/analytics/next";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jeni's Lashes & Brows | Cejas y pestanas en Camaguey",
    template: "%s | Jeni's Lashes & Brows",
  },
  description:
    "Landing, CMS y dashboard para Jeni's Lashes & Brows. Agenda por WhatsApp y gestiona citas, contenido y finanzas desde un solo sistema.",
  icons: {
    icon: [{ url: "/brand-logo.png", type: "image/png", sizes: "512x512" }],
    shortcut: [{ url: "/brand-logo.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/brand-logo.png", type: "image/png", sizes: "512x512" }],
  },
  openGraph: {
    title: "Jeni's Lashes & Brows",
    description: "Cejas y pestanas en Camaguey. Agenda por WhatsApp.",
    url: "/",
    siteName: "Jeni's Lashes & Brows",
    images: [
      {
        url: "/og-logo-camaguey-v2.png",
        width: 1200,
        height: 630,
        alt: "Jeni's Lashes & Brows",
      },
    ],
    locale: "es_CU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jeni's Lashes & Brows",
    description: "Cejas y pestanas en Camaguey. Agenda por WhatsApp.",
    images: ["/og-logo-camaguey-v2.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light")}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}
