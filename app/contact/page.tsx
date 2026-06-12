import Link from "next/link";
import { getCompanyProfile } from "@/lib/cms/queries";

export const metadata = { title: "Contact — Open Limits Design" };

export default async function ContactPage() {
  const company = await getCompanyProfile();

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Contact</p>
            <h1>Let’s talk about your project.</h1>
            <p>{company.description}</p>
          </div>
        </div>

        <div className="contact-grid">
          <div className="card">
            <div className="card-body">
              <h3>Studio details</h3>
              <p>{company.address ?? "Address — editable from Admin → Homepage."}</p>
              <p>{company.phone ?? "Phone — editable from Admin → Homepage."}</p>
              <p>{company.email ?? "Email — editable from Admin → Homepage."}</p>
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
    </main>
  );
}
