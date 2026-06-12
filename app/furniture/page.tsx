import FurnitureCatalog from "@/components/furniture/FurnitureCatalog";
import { getFurnitureItems } from "@/lib/cms/queries";

export const metadata = { title: "Furniture — Open Limits Design" };

export default async function FurniturePage() {
  const items = await getFurnitureItems();

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Furniture</p>
            <h1>The collection.</h1>
            <p>
              Filter by category. Product names drive category matching — sofas, majlis, chairs,
              tables, lighting, and more.
            </p>
          </div>
        </div>
        <FurnitureCatalog items={items} />
      </section>
    </main>
  );
}
