import Link from "next/link";
import { getProjects } from "@/lib/cms/queries";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Projects</p>
            <h1>Unlimited project pages.</h1>
            <p>
              Project pages, cover images, completion dates, locations, galleries, and comparisons are
              controlled from the admin CMS.
            </p>
          </div>
        </div>

        {projects.length ? (
          <div className="grid">
            {projects.map((project) => (
              <Link className="card" href={`/projects/${project.slug}`} key={project.id}>
                {project.featured_image ? (
                  <img
                    className="project-cover"
                    src={project.featured_image.public_url}
                    alt={project.featured_image.alt_text ?? project.title}
                  />
                ) : (
                  <div className="image-placeholder">Featured cover</div>
                )}
                <div className="card-body">
                  <p className="meta">
                    {[project.location, project.completion_date].filter(Boolean).join(" · ") || "Project"}
                  </p>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">No published projects yet. Create one in the admin dashboard.</div>
        )}
      </section>
    </main>
  );
}
