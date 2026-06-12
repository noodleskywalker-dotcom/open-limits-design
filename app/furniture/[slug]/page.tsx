import Link from "next/link";
import { notFound } from "next/navigation";
import { getFurnitureItemBySlug, getRelatedFurnitureItems } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

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

  const related = await getRelatedFurnitureItems(item);
  const heroImage = resolveImageUrl(item.featured_image ?? item.gallery?.[0]);

  const specs: { label: string; value: string }[] = [];
  if (item.dimensions) specs.push({ label: "Dimensions", value: item.dimensions });
  if (item.width) specs.push({ label: "Width", value: item.width });
  if (item.depth) specs.push({ label: "Depth / Length", value: item.depth });
  if (item.height) specs.push({ label: "Height", value: item.height });
  if (item.materials) specs.push({ label: "Materials", value: item.materials });
  if (item.finishes) specs.push({ label: "Finishes", value: item.finishes });
  if (item.features) specs.push({ label: "Features", value: item.features });
  if (item.availability) specs.push({ label: "Availability", value: item.availability });

  return (
    <main className="page">
      <section className="section detail-hero">
        <div>
          <p className="eyebrow">
            {item.category?.name ?? "Furniture"}
            {item.collection ? ` · ${item.collection}` : ""}
          </p>
          <h1>{item.title}</h1>
          <p className="lead">{item.description}</p>
          {specs.length ? (
            <div className="spec-list">
              {specs.map((spec) => (
                <div key={spec.label}>
                  <strong>{spec.label}</strong>
                  <p>{spec.value}</p>
                </div>
              ))}
            </div>
          ) : null}
          {item.material_records?.length ? (
            <div className="material-chips">
              {item.material_records.map((material) => (
                <span className="material-chip" key={material.id}>
                  {material.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {heroImage ? (
          <img className="project-cover card" src={heroImage} alt={item.title} />
        ) : (
          <div className="image-placeholder card tall">{item.title}</div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Gallery</p>
            <h2>Every angle.</h2>
          </div>
        </div>
        {item.gallery?.length ? (
          <div className="gallery-grid">
            {item.gallery.map((image) => (
              <img key={image.id} src={image.public_url} alt={image.alt_text ?? item.title} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Add images to this item from Admin → Furniture.</div>
        )}
      </section>

      {related.length ? (
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Related</p>
              <h2>More from {item.category?.name ?? "this collection"}.</h2>
            </div>
          </div>
          <div className="grid">
            {related.map((relatedItem) => {
              const image = resolveImageUrl(relatedItem.featured_image ?? relatedItem.gallery?.[0]);
              return (
                <Link className="card" href={`/furniture/${relatedItem.slug}`} key={relatedItem.id}>
                  {image ? (
                    <img className="project-cover" src={image} alt={relatedItem.title} />
                  ) : (
                    <div className="image-placeholder">{relatedItem.title}</div>
                  )}
                  <div className="card-body">
                    <h3>{relatedItem.title}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
