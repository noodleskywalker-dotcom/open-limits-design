import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

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

  const cover = resolveImageUrl(project.featured_image, project.cover_image_url);

  return (
    <main className="page">
      <section className="section detail-hero">
        <div>
          <p className="eyebrow">{project.category ?? "Project"}</p>
          <h1>{project.title}</h1>
          {project.description ? <p className="lead">{project.description}</p> : null}
          <p className="meta">
            {[project.location, project.completion_date].filter(Boolean).join(" · ") ||
              "Project details"}
          </p>
        </div>
        {cover ? (
          <img className="project-cover card" src={cover} alt={project.title} />
        ) : (
          <div className="image-placeholder card">Cover image</div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Gallery</p>
            <h2>Project imagery.</h2>
          </div>
        </div>
        {project.gallery?.length ? (
          <div className="gallery-grid">
            {project.gallery.map((image) => (
              <img key={image.id} src={image.public_url} alt={image.alt_text ?? project.title} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Add gallery images to this project in admin.</div>
        )}
      </section>

      {project.comparisons?.length ? (
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Before / After</p>
              <h2>Transformation.</h2>
            </div>
          </div>
          <div className="grid">
            {project.comparisons.map((comparison) => (
              <article className="comparison" key={comparison.id}>
                <div className="comparison-images">
                  <div className="comparison-panel">
                    {comparison.before_image ? (
                      <img
                        src={comparison.before_image.public_url}
                        alt={`${comparison.label} before`}
                      />
                    ) : null}
                    <span className="comparison-label">Before</span>
                  </div>
                  <div className="comparison-panel">
                    {comparison.after_image ? (
                      <img src={comparison.after_image.public_url} alt={`${comparison.label} after`} />
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
        </section>
      ) : null}
    </main>
  );
}
