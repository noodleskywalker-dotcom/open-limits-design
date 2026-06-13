import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FurnitureProductPanel from "@/components/furniture/FurnitureProductPanel";
import FurnitureShowroomHighlight from "@/components/furniture/FurnitureShowroomHighlight";
import { getCompanyProfile, getFurnitureItemBySlug, getRelatedFurnitureItems } from "@/lib/cms/queries";
import { getFurnitureCategory } from "@/lib/furniture-categories";
import { resolveImageUrl } from "@/lib/cms/types";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getFurnitureItemBySlug(slug);
  if (!item) {
    return { title: "Furniture — Open Limits Design" };
  }

  const title = item.seo_title?.trim() || `${item.title} — Open Limits Design`;
  const description =
    item.meta_description?.trim() ||
    item.description?.slice(0, 160) ||
    `Custom ${item.title} by Open Limits Design.`;

  const heroImage = resolveImageUrl(item.featured_image ?? item.gallery?.[0]);

  return {
    title,
    description,
    openGraph: heroImage
      ? {
          title,
          description,
          images: [{ url: heroImage, alt: item.title }]
        }
      : { title, description }
  };
}

export default async function FurnitureDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const [item, company] = await Promise.all([getFurnitureItemBySlug(slug), getCompanyProfile()]);

  if (!item) {
    notFound();
  }

  const related = await getRelatedFurnitureItems(item);
  const heroImage = resolveImageUrl(item.featured_image ?? item.gallery?.[0]);
  const categoryName = getFurnitureCategory(item.title);
  const phone = company.phone ?? "+974 7788 9033";

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
    <main className={`page ${from === "showroom" ? "from-showroom" : ""}`}>
      {from === "showroom" ? <FurnitureShowroomHighlight title={item.title} /> : null}
      <section className="section furniture-detail">
        <div className="furniture-detail-media">
          {heroImage ? (
            <div className="furniture-image-wrap large">
              <img alt={item.title} className="furniture-image" src={heroImage} />
            </div>
          ) : (
            <div className="image-placeholder card tall">{item.title}</div>
          )}
        </div>
        <div className="furniture-detail-info">
          <p className="eyebrow">
            {categoryName}
            {item.collection ? ` · ${item.collection}` : ""}
          </p>
          <h1>{item.title}</h1>
          <p className="lead">{item.description}</p>
          <FurnitureProductPanel
            materials={item.material_records ?? []}
            phone={phone}
            specs={specs}
            title={item.title}
            upholstery={item.upholstery ?? null}
          />
        </div>
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
              <div className="furniture-image-wrap" key={image.id}>
                <img
                  alt={image.alt_text ?? item.title}
                  className="furniture-image"
                  src={image.public_url}
                />
              </div>
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
              <h2>More from {categoryName}.</h2>
            </div>
          </div>
          <div className="grid">
            {related.map((relatedItem) => {
              const image = resolveImageUrl(relatedItem.featured_image ?? relatedItem.gallery?.[0]);
              return (
                <Link className="card furniture-card" href={`/furniture/${relatedItem.slug}`} key={relatedItem.id}>
                  <div className="furniture-image-wrap">
                    {image ? (
                      <img alt={relatedItem.title} className="furniture-image" src={image} />
                    ) : (
                      <div className="image-placeholder">{relatedItem.title}</div>
                    )}
                  </div>
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
