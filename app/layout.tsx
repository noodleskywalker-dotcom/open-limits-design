import type { Metadata } from "next";
import Link from "next/link";
import AIAssistant from "@/components/ai/AIAssistant";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Limits Design — Luxury Architecture, Interiors & Furniture",
  description:
    "Luxury architecture, interior design, and bespoke furniture studio. Book a meeting with our CEO."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            OPEN LIMITS <span>DESIGN</span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/projects">Projects</Link>
            <Link href="/furniture">Furniture</Link>
            <Link href="/materials">Materials</Link>
            <Link href="/services">Services</Link>
            <Link href="/team">Team</Link>
            <Link href="/contact">Contact</Link>
            <Link className="nav-cta" href="/book-meeting-with-ceo">
              Book a Meeting
            </Link>
          </nav>
        </header>
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
            <Link href="/book-meeting-with-ceo">Book a Meeting</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </footer>
        <AIAssistant />
      </body>
    </html>
  );
}
