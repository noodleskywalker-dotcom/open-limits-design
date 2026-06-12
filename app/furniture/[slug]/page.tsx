import { notFound } from "next/navigation";
import { getFurnitureItemBySlug } from "@/lib/cms/queries";

export default async function FurnitureDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getFurnitureItemBySlug(slug);

  if (!item) {
    notFound();
  }

  const heroImage = item.featured_image ?? item.gallery?.[0] ?? null;

  return (
    <main className="page">
      <section className="section detail-hero">
        <div>
          <p className="eyebrow">{item.category?.name ?? "Furniture"}</p>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
          <div className="spec-list">
            {item.dimensions ? (
              <div>
                <strong>Dimensions</strong>
                <p>{item.dimensions}</p>
              </div>
            ) : null}
            {item.materials ? (
              <div>
                <strong>Materials</strong>
                <p>{item.materials}</p>
              </div>
            ) : null}
          </div>
        </div>
        {heroImage ? (
          <img
            className="project-cover card"
            src={heroImage.public_url}
            alt={heroImage.alt_text ?? item.title}
          />
        ) : (
          <div className="image-placeholder card">Furniture image</div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Images</p>
            <h2>Furniture gallery.</h2>
          </div>
        </div>

        {item.gallery?.length ? (
          <div className="gallery-grid">
            {item.gallery.map((image) => (
              <img key={image.id} src={image.public_url} alt={image.alt_text ?? item.title} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Add more furniture images to this item in admin.</div>
        )}
      </section>
    </main>
  );
}
