import type { Metadata } from "next";
import Link from "next/link";
import AIAssistant from "@/components/ai/AIAssistant";
import SiteHeader from "@/components/layout/SiteHeader";
import { LEGACY_LOGO_URL } from "@/lib/cms/legacy-images";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Limits Design — Luxury Architecture, Interiors & Furniture",
  description:
    "Luxury architecture, interior design, and bespoke furniture studio. Book a meeting with our CEO.",
  icons: {
    icon: LEGACY_LOGO_URL,
    apple: LEGACY_LOGO_URL
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div>
            <p className="brand">
              OPEN LIMITS <span>DESIGN</span>
            </p>
            <p className="meta">Luxury architecture · Interior design · Bespoke furniture</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/projects">Projects</Link>
            <Link href="/furniture">Furniture</Link>
            <Link href="/location">LOCATION</Link>
            <Link href="/book-meeting-with-ceo">Book a Meeting</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </footer>
        <AIAssistant />
      </body>
    </html>
  );
}
