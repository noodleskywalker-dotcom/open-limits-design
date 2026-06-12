import Link from "next/link";
import OfficeLocation from "@/components/location/OfficeLocation";
import {
  getCompanyProfile,
  getFurnitureItems,
  getHomepageHeroImages,
  getProjects,
  getServices,
  getTeamMembers
} from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export default async function HomePage() {
  const [company, heroImages, services, projects, furniture, team] = await Promise.all([
    getCompanyProfile(),
    getHomepageHeroImages(),
    getServices(),
    getProjects(),
    getFurnitureItems(),
    getTeamMembers()
  ]);

  const heroImage = heroImages[0]?.media ?? null;
  const ceoImage = resolveImageUrl(company.ceo_image);
  const featuredProjects = projects.filter((project) => project.is_featured);
  const homeProjects = (featuredProjects.length ? featuredProjects : projects).slice(0, 3);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{company.tagline ?? "Architecture · Interior Design · Furniture"}</p>
          <h1>{company.hero_headline ?? company.name}</h1>
          <p className="hero-sub">{company.hero_subheadline ?? company.description}</p>
          <div className="button-row">
            <Link className="button" href="/book-meeting-with-ceo">
              Book a Meeting
            </Link>
            <Link className="button ghost" href="/projects">
              View Projects
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          {heroImage ? (
            <img src={heroImage.public_url} alt={heroImage.alt_text ?? "Open Limits Design"} />
          ) : (
            <div className="hero-visual-placeholder">
              <span>OPEN LIMITS</span>
            </div>
          )}
        </div>
      </section>

      <div className="page">
        <section className="section" id="about">
          <div className="ceo-section">
            <div className="ceo-image-wrap">
              {ceoImage ? (
                <img src={ceoImage} alt={company.ceo_name ?? "CEO"} />
              ) : (
                <div className="image-placeholder tall">CEO portrait — set it in Admin → Homepage</div>
              )}
            </div>
            <div>
              <p className="eyebrow">About the Studio</p>
              <h2>{company.ceo_name ?? "Our Founder"}</h2>
              <p className="lead">
                {company.ceo_bio ??
                  "Leading Open Limits with vision and expertise in luxury design and contracting."}
              </p>
              {company.about_text ? <p>{company.about_text}</p> : null}
              <Link className="button ghost" href="/book-meeting-with-ceo">
                Meet the CEO
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Services</p>
              <h2>What we deliver.</h2>
            </div>
            <Link className="button ghost" href="/services">
              All services
            </Link>
          </div>
          <div className="grid">
            {services.slice(0, 8).map((service) => {
              const image = resolveImageUrl(service.image, service.image_url);
              return (
                <article className="card" key={service.id}>
                  {image ? <img className="project-cover" src={image} alt={service.title} /> : null}
                  <div className="card-body">
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2>Featured projects.</h2>
            </div>
            <Link className="button ghost" href="/projects">
              All projects
            </Link>
          </div>
          {homeProjects.length ? (
            <div className="grid">
              {homeProjects.map((project) => {
                const cover = resolveImageUrl(project.featured_image, project.cover_image_url);
                return (
                  <Link className="card" href={`/projects/${project.slug}`} key={project.id}>
                    {cover ? (
                      <img className="project-cover" src={cover} alt={project.title} />
                    ) : (
                      <div className="image-placeholder">{project.title}</div>
                    )}
                    <div className="card-body">
                      <p className="meta">{project.location ?? project.category ?? "Project"}</p>
                      <h3>{project.title}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">Projects you add in the admin dashboard appear here.</div>
          )}
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Furniture</p>
              <h2>Bespoke collections.</h2>
            </div>
            <Link className="button ghost" href="/furniture">
              Full catalog
            </Link>
          </div>
          {furniture.length ? (
            <div className="grid">
              {furniture.slice(0, 3).map((item) => {
                const image = resolveImageUrl(item.featured_image ?? item.gallery?.[0]);
                return (
                  <Link className="card" href={`/furniture/${item.slug}`} key={item.id}>
                    {image ? (
                      <img className="project-cover" src={image} alt={item.title} />
                    ) : (
                      <div className="image-placeholder">{item.title}</div>
                    )}
                    <div className="card-body">
                      <p className="meta">{item.category?.name ?? "Furniture"}</p>
                      <h3>{item.title}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">Furniture items you publish in admin appear here.</div>
          )}
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Team</p>
              <h2>The people behind the work.</h2>
            </div>
            <Link className="button ghost" href="/team">
              Meet the team
            </Link>
          </div>
          {team.length ? (
            <div className="grid">
              {team.slice(0, 3).map((member) => {
                const photo = resolveImageUrl(member.photo, member.photo_url);
                return (
                  <article className="card" key={member.id}>
                    {photo ? (
                      <img src={photo} alt={member.name} />
                    ) : (
                      <div className="image-placeholder">{member.name}</div>
                    )}
                    <div className="card-body">
                      <p className="meta">{member.role}</p>
                      <h3>{member.name}</h3>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="section cta-band">
          <div>
            <p className="eyebrow">Start your project</p>
            <h2>Book a private meeting with our CEO.</h2>
            <p>Choose a date and time that suits you — we confirm every request personally.</p>
          </div>
          <div className="button-row">
            <Link className="button" href="/book-meeting-with-ceo">
              Book a Meeting
            </Link>
            <Link className="button ghost" href="/contact">
              Contact us
            </Link>
          </div>
        </section>
      </div>

      <OfficeLocation company={company} />
    </main>
  );
}
