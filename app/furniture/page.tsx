import FurnitureCatalog from "@/components/furniture/FurnitureCatalog";
import { getFurnitureCategories, getFurnitureItems } from "@/lib/cms/queries";

export const metadata = { title: "Furniture — Open Limits Design" };

export default async function FurniturePage() {
  const [categories, items] = await Promise.all([getFurnitureCategories(), getFurnitureItems()]);

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Furniture</p>
            <h1>The collection.</h1>
            <p>
              Filter by category. Items, images, dimensions, and materials are all managed from
              Admin → Furniture.
            </p>
          </div>
        </div>
        <FurnitureCatalog categories={categories} items={items} />
      </section>
    </main>
  );
}
