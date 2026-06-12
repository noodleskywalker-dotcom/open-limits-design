import Link from "next/link";

const DISCIPLINES = [
  {
    title: "Architecture",
    href: "/services#architecture",
    description: "Concept to delivery for residential and commercial spaces."
  },
  {
    title: "Projects",
    href: "/projects",
    description: "A curated portfolio of completed work across Qatar."
  },
  {
    title: "Furniture",
    href: "/furniture",
    description: "Bespoke collections, majlis, bedrooms, and custom pieces."
  },
  {
    title: "Interior",
    href: "/services#interior-design",
    description: "Material palettes, spatial planning, and turnkey interiors."
  }
] as const;

export default function DisciplineBoxes() {
  return (
    <section className="discipline-section">
      <div className="discipline-grid">
        {DISCIPLINES.map((item, index) => (
          <Link
            className="discipline-box"
            href={item.href}
            key={item.title}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <span className="discipline-index">0{index + 1}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
