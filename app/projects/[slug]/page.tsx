import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/cms/queries";

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="page">
      <section className="section detail-hero">
        <div>
          <p className="eyebrow">Project</p>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
          <p className="meta">
            {[project.location, project.completion_date].filter(Boolean).join(" · ") || "Project details"}
          </p>
        </div>
        {project.featured_image ? (
          <img
            className="project-cover card"
            src={project.featured_image.public_url}
            alt={project.featured_image.alt_text ?? project.title}
          />
        ) : (
          <div className="image-placeholder card">Featured cover image</div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Gallery</p>
            <h2>Automatically populated from uploads.</h2>
          </div>
        </div>
        {project.gallery?.length ? (
          <div className="gallery-grid">
            {project.gallery.map((image) => (
              <img key={image.id} src={image.public_url} alt={image.alt_text ?? image.title} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Add gallery images to this project in admin.</div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Before / After</p>
            <h2>Project comparisons.</h2>
          </div>
        </div>
        {project.comparisons?.length ? (
          <div className="grid">
            {project.comparisons.map((comparison) => (
              <article className="comparison" key={comparison.id}>
                <div className="comparison-images">
                  <div className="comparison-panel">
                    {comparison.before_image ? (
                      <img
                        src={comparison.before_image.public_url}
                        alt={comparison.before_image.alt_text ?? `${comparison.label} before`}
                      />
                    ) : null}
                    <span className="comparison-label">Before</span>
                  </div>
                  <div className="comparison-panel">
                    {comparison.after_image ? (
                      <img
                        src={comparison.after_image.public_url}
                        alt={comparison.after_image.alt_text ?? `${comparison.label} after`}
                      />
                    ) : null}
                    <span className="comparison-label">After</span>
                  </div>
                </div>
                <div className="card-body">
                  <h3>{comparison.label}</h3>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">Add before/after pairs for this project in admin.</div>
        )}
      </section>
    </main>
  );
}
