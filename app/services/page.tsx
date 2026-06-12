import { getServices } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = { title: "Services — Open Limits Design" };

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Services</p>
            <h1>Architecture to handover.</h1>
            <p>Every service below is managed from the admin CMS — text and images included.</p>
          </div>
        </div>
        {services.length ? (
          <div className="grid">
            {services.map((service) => {
              const image = resolveImageUrl(service.image, service.image_url);
              return (
                <article className="card" key={service.id}>
                  {image ? (
                    <img className="project-cover" src={image} alt={service.title} />
                  ) : null}
                  <div className="card-body">
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">Add services from the admin dashboard.</div>
        )}
      </section>
    </main>
  );
}
