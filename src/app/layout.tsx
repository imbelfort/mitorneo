import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HeaderBar from "@/components/layout/header-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MiTorneo - Gestión de Torneos de Ráquet y Frontón",
    template: "%s | MiTorneo",
  },
  description:
    "Organiza, gestiona y sigue torneos de Ráquet y Frontón en tiempo real. Fixtures automatizados, rankings, inscripciones y resultados en vivo. La plataforma líder en gestión deportiva.",
  keywords: [
    "raquet",
    "fronton",
    "torneos",
    "campeonatos",
    "bolivia",
    "deporte",
    "gestion deportiva",
    "fixtures",
    "resultados en vivo",
  ],
  authors: [{ name: "Migartec", url: "https://migartec.com" }],
  creator: "Migartec",
  openGraph: {
    type: "website",
    locale: "es_BO",
    url: "https://mitorneo.com",
    title: "MiTorneo - Gestión de Torneos de Ráquet y Frontón",
    description:
      "La plataforma integral para torneos deportivos. Gestiona inscripciones, brackets y resultados de forma profesional.",
    siteName: "MiTorneo",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiTorneo - Gestión Profesional de Torneos",
    description: "Organiza tu torneo de Ráquet o Frontón en minutos.",
    creator: "@migartec",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

import Footer from "@/components/layout/footer";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} bg-[var(--background)] text-[var(--foreground)] antialiased overflow-x-hidden`}
      >
        <Providers session={session}>
          <HeaderBar />
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
