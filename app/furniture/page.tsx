import Link from "next/link";
import { getFurnitureCategories, getFurnitureItems } from "@/lib/cms/queries";

export default async function FurniturePage() {
  const [categories, items] = await Promise.all([getFurnitureCategories(), getFurnitureItems()]);

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Furniture</p>
            <h1>Furniture managed from the CMS.</h1>
            <p>
              Categories, images, dimensions, materials, descriptions, and publication state are controlled from
              the Furniture tab in the admin dashboard.
            </p>
          </div>
        </div>

        {categories.length ? (
          <div className="category-list">
            {categories.map((category) => (
              <a className="category-pill" href={`#${category.slug}`} key={category.id}>
                {category.name}
              </a>
            ))}
          </div>
        ) : null}
      </section>

      {categories.map((category) => {
        const categoryItems = items.filter((item) => item.category_id === category.id);

        return (
          <section className="section" id={category.slug} key={category.id}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Category</p>
                <h2>{category.name}</h2>
                {category.description ? <p>{category.description}</p> : null}
              </div>
            </div>

            {categoryItems.length ? (
              <div className="grid">
                {categoryItems.map((item) => (
                  <Link className="card" href={`/furniture/${item.slug}`} key={item.id}>
                    {item.featured_image ? (
                      <img
                        className="project-cover"
                        src={item.featured_image.public_url}
                        alt={item.featured_image.alt_text ?? item.title}
                      />
                    ) : item.gallery?.[0] ? (
                      <img
                        className="project-cover"
                        src={item.gallery[0].public_url}
                        alt={item.gallery[0].alt_text ?? item.title}
                      />
                    ) : (
                      <div className="image-placeholder">Furniture image</div>
                    )}
                    <div className="card-body">
                      <p className="meta">{category.name}</p>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      {item.dimensions ? <p className="meta">Dimensions: {item.dimensions}</p> : null}
                      {item.materials ? <p className="meta">Materials: {item.materials}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">Add published furniture items to this category in admin.</div>
            )}
          </section>
        );
      })}

      {!categories.length ? (
        <section className="section">
          <div className="empty-state">Create furniture categories in the admin dashboard.</div>
        </section>
      ) : null}
    </main>
  );
}
