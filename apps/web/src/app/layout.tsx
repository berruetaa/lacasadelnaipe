import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "La Casa del Naipe",
    template: "%s · La Casa del Naipe",
  },
  description:
    "Archivo, catálogo y colección dedicada a documentar el naipe, con foco inicial en Uruguay y el Río de la Plata.",
  openGraph: {
    title: "La Casa del Naipe",
    description: "Archivo, catálogo y colección del naipe.",
    type: "website",
    locale: "es_UY",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-UY">
      <body>{children}</body>
    </html>
  );
}
