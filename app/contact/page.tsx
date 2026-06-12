import Link from "next/link";
import OfficeLocation from "@/components/location/OfficeLocation";
import { getCompanyProfile, getServices } from "@/lib/cms/queries";

export const metadata = { title: "Contact — Open Limits Design" };

export default async function ContactPage() {
  const [company, services] = await Promise.all([getCompanyProfile(), getServices()]);

  return (
    <main>
      <div className="page">
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Contact</p>
              <h1>Let’s talk about your project.</h1>
              <p>{company.description}</p>
              {services.length ? (
                <p className="meta">
                  {services.map((service) => service.title).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="contact-grid">
            <div className="card">
              <div className="card-body">
                <h3>Studio details</h3>
                <p>{company.address ?? "Street 303, Zone 69, Building 254, Unit 303, Lusail, Qatar"}</p>
                <p>{company.phone ?? "+974 7788 9033"}</p>
                <p>{company.email ?? "info@openlimitsdesign.com"}</p>
              </div>
            </div>
            <div className="card cta-card">
              <div className="card-body">
                <h3>Prefer a meeting?</h3>
                <p>Book a private consultation with our CEO using the online calendar.</p>
                <Link className="button" href="/book-meeting-with-ceo">
                  Book a Meeting
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <OfficeLocation company={company} />
    </main>
  );
}
