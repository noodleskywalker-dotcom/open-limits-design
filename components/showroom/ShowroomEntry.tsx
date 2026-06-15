import Link from "next/link";
import type { ShowroomSection } from "@/lib/cms/types";
import { sortShowroomSections } from "@/lib/cms/showroom-order";
import { resolveImageUrl } from "@/lib/cms/types";

export default function ShowroomEntry({ sections }: { sections: ShowroomSection[] }) {
  const ordered = sortShowroomSections(sections);

  return (
    <section className="showroom-entry">
      <header className="showroom-entry-intro">
        <p className="eyebrow">Open Limits Design</p>
        <h2>Explore our disciplines</h2>
        <p className="meta">Architecture, interiors, portfolio, and bespoke furniture — curated for luxury living.</p>
      </header>
      <div className="showroom-entry-grid">
        {ordered.map((section, index) => {
          const image = resolveImageUrl(section.image);
          const href = section.link_url ?? `/showroom/${section.slug}`;
          return (
            <Link
              className="showroom-entry-box"
              href={href}
              key={section.id}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {image ? (
                <img alt={section.title} className="showroom-entry-bg" loading="lazy" src={image} />
              ) : (
                <div aria-hidden className="showroom-entry-bg showroom-entry-bg-fallback" />
              )}
              <div className="showroom-entry-overlay" />
              <div className="showroom-entry-shine" aria-hidden />
              <div className="showroom-entry-body">
                <span className="discipline-index">0{index + 1}</span>
                <h3>{section.title}</h3>
                {section.description ? <p>{section.description}</p> : null}
                <span className="showroom-entry-cta">Enter experience</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
