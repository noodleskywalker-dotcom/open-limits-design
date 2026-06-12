import Link from "next/link";
import { getProjects } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = { title: "Projects — Open Limits Design" };

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h1>Selected projects.</h1>
            <p>Covers, galleries, locations, and dates are all managed from Admin → Projects.</p>
          </div>
        </div>

        {projects.length ? (
          <div className="grid">
            {projects.map((project) => {
              const cover = resolveImageUrl(project.featured_image, project.cover_image_url);
              return (
                <Link className="card" href={`/projects/${project.slug}`} key={project.id}>
                  {cover ? (
                    <img className="project-cover" src={cover} alt={project.title} />
                  ) : (
                    <div className="image-placeholder">{project.title}</div>
                  )}
                  <div className="card-body">
                    <p className="meta">
                      {[project.location, project.category, project.completion_date]
                        .filter(Boolean)
                        .join(" · ") || "Project"}
                    </p>
                    <h3>{project.title}</h3>
                    {project.description ? <p>{project.description}</p> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No published projects yet. Create one in the admin dashboard.</div>
        )}
      </section>
    </main>
  );
}
