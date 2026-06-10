import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Limits Design",
  description: "Architecture, interior design, furniture, projects, and company CMS."
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
            Open Limits Design
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/projects">Projects</Link>
            <Link href="/team">Team</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
