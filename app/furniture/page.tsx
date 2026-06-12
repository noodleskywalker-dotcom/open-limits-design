import FurnitureCatalog from "@/components/furniture/FurnitureCatalog";
import { getFurnitureItems } from "@/lib/cms/queries";

export const metadata = { title: "Furniture — Open Limits Design" };

export default async function FurniturePage() {
  const items = await getFurnitureItems();

  return (
    <main className="page">
      <section className="section furniture-page-hero">
        <div className="furniture-hero-banner">
          <img
            alt="Open Limits furniture showroom"
            className="furniture-hero-bg"
            src="/images/legacy/furniture-showroom-feature.jpeg"
          />
          <div className="furniture-hero-overlay" />
          <div className="furniture-hero-copy">
            <p className="eyebrow">Furniture</p>
            <h1>The collection.</h1>
            <p>
              Bespoke majlis, dining, bedroom, and living pieces — crafted in Qatar and tailored to
              each project.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <FurnitureCatalog items={items} />
      </section>
    </main>
  );
}
