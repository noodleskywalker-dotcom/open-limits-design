import Link from "next/link";
import {
  getCompanyProfile,
  getFurnitureItems,
  getHomepageHeroImages,
  getProjects,
  getServices,
  getTeamMembers
} from "@/lib/cms/queries";

export default async function HomePage() {
  const [company, heroImages, services, projects, furniture, team] = await Promise.all([
    getCompanyProfile(),
    getHomepageHeroImages(),
    getServices(),
    getProjects(),
    getFurnitureItems(),
    getTeamMembers()
  ]);

  const heroImage = heroImages[0]?.media;

  return (
    <main>
      <section className="hero">
        <div className="hero-media">
          {heroImage ? <img src={heroImage.public_url} alt={heroImage.alt_text ?? heroImage.title} /> : null}
          <div className="hero-content">
            <div>
              <p className="eyebrow">{company.tagline ?? "Architecture · Interiors · Furniture"}</p>
              <h1>{company.hero_headline ?? company.name}</h1>
              <p>{company.hero_subheadline ?? company.description}</p>
              <div className="button-row">
                <Link className="button" href="/projects">
                  View Projects
                </Link>
                <Link className="button secondary" href="/admin">
                  Open CMS
                </Link>
              </div>
            </div>
            <aside className="ceo-card" aria-label="CEO image">
              {company.ceo_image ? (
                <img
                  src={company.ceo_image.public_url}
                  alt={company.ceo_image.alt_text ?? "CEO portrait"}
                />
              ) : (
                <div className="ceo-placeholder">CEO image managed in admin</div>
              )}
            </aside>
          </div>
        </div>
      </section>

      <div className="page">
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Services</p>
              <h2>Edit services from the CMS.</h2>
            </div>
          </div>
          <div className="grid">
            {services.map((service) => (
              <article className="card" key={service.id}>
                <div className="card-body">
                  <p className="eyebrow">{service.icon ?? "Service"}</p>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Furniture</p>
              <h2>Furniture collections update from admin.</h2>
            </div>
            <Link className="button light" href="/furniture">
              View furniture
            </Link>
          </div>
          {furniture.length ? (
            <div className="grid">
              {furniture.slice(0, 3).map((item) => {
                const image = item.featured_image ?? item.gallery?.[0] ?? null;

                return (
                  <Link className="card" href={`/furniture/${item.slug}`} key={item.id}>
                    {image ? (
                      <img
                        className="project-cover"
                        src={image.public_url}
                        alt={image.alt_text ?? item.title}
                      />
                    ) : (
                      <div className="image-placeholder">Furniture image</div>
                    )}
                    <div className="card-body">
                      <p className="meta">{item.category?.name ?? "Furniture"}</p>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">Add furniture categories, items, and images from the dashboard.</div>
          )}
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Projects</p>
              <h2>Latest work updates automatically.</h2>
            </div>
            <Link className="button light" href="/projects">
              All projects
            </Link>
          </div>
          {projects.length ? (
            <div className="grid">
              {projects.slice(0, 3).map((project) => (
                <Link className="card" href={`/projects/${project.slug}`} key={project.id}>
                  {project.featured_image ? (
                    <img
                      className="project-cover"
                      src={project.featured_image.public_url}
                      alt={project.featured_image.alt_text ?? project.title}
                    />
                  ) : (
                    <div className="image-placeholder">Cover image</div>
                  )}
                  <div className="card-body">
                    <p className="meta">{project.location ?? "Project"}</p>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">Create projects in the admin dashboard to populate this area.</div>
          )}
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Team</p>
              <h2>Staff profiles are managed in admin.</h2>
            </div>
            <Link className="button light" href="/team">
              Meet the team
            </Link>
          </div>
          {team.length ? (
            <div className="grid">
              {team.slice(0, 4).map((member) => (
                <article className="card" key={member.id}>
                  {member.photo ? (
                    <img src={member.photo.public_url} alt={member.photo.alt_text ?? member.name} />
                  ) : (
                    <div className="image-placeholder">Staff photo</div>
                  )}
                  <div className="card-body">
                    <p className="meta">{member.role}</p>
                    <h3>{member.name}</h3>
                    {member.bio ? <p>{member.bio}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Add team members and staff photos from the dashboard.</div>
          )}
        </section>
      </div>
    </main>
  );
}
