import { getMaterials } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = { title: "Material Library — Open Limits Design" };

export default async function MaterialsPage() {
  const materials = await getMaterials();

  const grouped = materials.reduce<Record<string, typeof materials>>((acc, material) => {
    const key = material.category ?? "Other";
    (acc[key] = acc[key] ?? []).push(material);
    return acc;
  }, {});

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Material Library</p>
            <h1>Materials we craft with.</h1>
            <p>
              Each material has an admin upload slot — replace the placeholder with a real swatch
              photo from Admin → Materials.
            </p>
          </div>
        </div>

        {Object.keys(grouped).length ? (
          Object.entries(grouped).map(([category, list]) => (
            <div className="material-group" key={category}>
              <h2>{category}</h2>
              <div className="grid">
                {list.map((material) => {
                  const image = resolveImageUrl(material.image);
                  return (
                    <article className="card" key={material.id}>
                      {image ? (
                        <img className="material-swatch" src={image} alt={material.name} />
                      ) : (
                        <div className="image-placeholder swatch">{material.name}</div>
                      )}
                      <div className="card-body">
                        <h3>{material.name}</h3>
                        {material.description ? <p>{material.description}</p> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            Run the database migration, then manage materials from Admin → Materials.
          </div>
        )}
      </section>
    </main>
  );
}
