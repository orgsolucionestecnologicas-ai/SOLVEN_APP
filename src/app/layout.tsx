import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLVEN",
  description: "Business control platform for small and medium-sized retail businesses"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
