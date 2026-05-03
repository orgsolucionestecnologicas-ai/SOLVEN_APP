import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLVEN",
  description: "Plataforma de control para negocios minoristas"
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
