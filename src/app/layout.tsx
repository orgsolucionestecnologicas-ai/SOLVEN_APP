import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLVEN — Gestión Comercial",
  description: "Plataforma de gestión comercial para pequeños negocios. Controlá ventas, stock, caja, clientes y más.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "SOLVEN — Gestión Comercial",
    description: "Plataforma de gestión comercial para pequeños negocios.",
    type: "website",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
