import Link from "next/link";
import { getCompanyProfile } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export default async function SiteHeader() {
  const profile = await getCompanyProfile();
  const logoUrl = resolveImageUrl(profile.logo_image);

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        {logoUrl ? (
          <img alt={profile.name} className="brand-logo" src={logoUrl} />
        ) : (
          <>
            OPEN LIMITS <span>DESIGN</span>
          </>
        )}
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/about">About</Link>
        <Link href="/projects">Projects</Link>
        <Link href="/furniture">Furniture</Link>
        <Link href="/materials">Materials</Link>
        <Link href="/services">Services</Link>
        <Link href="/location">LOCATION</Link>
        <Link href="/team">Team</Link>
        <Link href="/contact">Contact</Link>
        <Link className="nav-cta" href="/book-meeting-with-ceo">
          Book a Meeting
        </Link>
      </nav>
    </header>
  );
}
