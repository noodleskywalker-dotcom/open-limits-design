import Link from "next/link";
import type { ShowroomSection } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";

export default function ShowroomEntry({ sections }: { sections: ShowroomSection[] }) {
  return (
    <section className="showroom-entry">
      <div className="showroom-entry-grid">
        {sections.map((section, index) => {
          const image = resolveImageUrl(section.image);
          const href = section.link_url ?? `/showroom/${section.slug}`;
          return (
            <Link
              className="showroom-entry-box"
              href={href}
              key={section.id}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {image ? (
                <img alt={section.title} className="showroom-entry-bg" src={image} />
              ) : null}
              <div className="showroom-entry-overlay" />
              <div className="showroom-entry-body">
                <span className="discipline-index">0{index + 1}</span>
                <h3>{section.title}</h3>
                {section.description ? <p>{section.description}</p> : null}
                <span className="showroom-entry-cta">Explore showroom →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
