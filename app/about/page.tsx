import Link from "next/link";
import OfficeLocation from "@/components/location/OfficeLocation";
import { getCompanyProfile, getServices, getTeamMembers } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = { title: "About — Open Limits Design" };

export default async function AboutPage() {
  const [company, services, team] = await Promise.all([
    getCompanyProfile(),
    getServices(),
    getTeamMembers()
  ]);

  const ceoImage = resolveImageUrl(company.ceo_image);

  return (
    <main>
      <div className="page">
        <section className="section">
          <div className="ceo-section">
            <div className="ceo-image-wrap">
              {ceoImage ? (
                <img alt={company.ceo_name ?? "CEO"} src={ceoImage} />
              ) : (
                <div className="image-placeholder tall">CEO portrait — set in Admin → Homepage</div>
              )}
            </div>
            <div>
              <p className="eyebrow">About</p>
              <h1>{company.name}</h1>
              <p className="lead">{company.description}</p>
              <h2>{company.ceo_name ?? "Our Founder"}</h2>
              <p>{company.ceo_bio}</p>
              {company.about_text ? <p>{company.about_text}</p> : null}
              <div className="button-row">
                <Link className="button" href="/book-meeting-with-ceo">
                  Book a Meeting
                </Link>
                <Link className="button ghost" href="/projects">
                  View Projects
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Services</p>
              <h2>What we deliver.</h2>
            </div>
          </div>
          <div className="grid">
            {services.map((service) => {
              const image = resolveImageUrl(service.image, service.image_url);
              return (
                <article className="card" id={service.slug ?? undefined} key={service.id}>
                  {image ? <img alt={service.title} className="project-cover" src={image} /> : null}
                  <div className="card-body">
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {team.length ? (
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Team</p>
                <h2>The people behind the work.</h2>
              </div>
              <Link className="button ghost" href="/team">
                Full team
              </Link>
            </div>
            <div className="grid">
              {team.map((member) => {
                const photo = resolveImageUrl(member.photo, member.photo_url);
                return (
                  <article className="card" key={member.id}>
                    {photo ? (
                      <img alt={member.name} src={photo} />
                    ) : (
                      <div className="image-placeholder">{member.name}</div>
                    )}
                    <div className="card-body">
                      <p className="meta">{member.role}</p>
                      <h3>{member.name}</h3>
                      {member.bio ? <p>{member.bio}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <OfficeLocation company={company} />
    </main>
  );
}
