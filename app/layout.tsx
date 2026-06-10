import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "B2B Lead Analyzer",
  description: "B2B lead research dashboard with AI sales notes"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
