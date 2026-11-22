import Link from "next/link";
import { CONSENT_VERSION } from "@/lib/crm/enquiry";

/**
 * Privacy notice for website enquiries and consultation bookings.
 * STATUS: see PRIVACY_NOTICE_STATUS in lib/crm/enquiry.ts (DRAFT — PENDING BUSINESS APPROVAL). Written for what this website actually
 * does (see lib/crm/*, app/api/contact, app/api/bookings). The GoHighLevel handoff
 * must stay disabled (GHL_HANDOFF_ENABLED=false) until management approves this text.
 * Update PRIVACY_NOTICE_UPDATED and CONSENT_VERSION together when the wording changes.
 */
const PRIVACY_NOTICE_UPDATED = "Pending approval";

export const metadata = {
  title: "Privacy Notice — Open Limits Design",
  description: "How Open Limits Design collects, uses and protects the details you share through our website."
};

export default function PrivacyPage() {
  return (
    <main>
      <div className="page">
        <section className="section privacy-notice">
          <p className="eyebrow">Privacy</p>
          <h1>Privacy Notice</h1>
          <p className="lead">
            This notice explains what Open Limits Design collects when you contact us or request a consultation
            through this website, why we collect it, and the choices you have.
          </p>
          <p className="meta">
            Last updated: {PRIVACY_NOTICE_UPDATED} · Consent reference: {CONSENT_VERSION}
          </p>

          <h2>Who we are</h2>
          <p>
            Open Limits Design is an architecture, interior design, fit-out and bespoke furniture studio based at
            Street 303, Zone 69, Building 254, Unit 303, Lusail, Qatar. For anything in this notice, contact us at{" "}
            <a href="mailto:info@openlimitsdesign.com">info@openlimitsdesign.com</a> or{" "}
            <a href="tel:+97477889033">+974 7788 9033</a>.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Enquiry form:</strong> your name, email address, phone number, project type and message.
            </li>
            <li>
              <strong>Consultation booking:</strong> your name, email address, optional phone number, notes, and the
              date and time you request.
            </li>
            <li>
              <strong>Website assistant:</strong> the messages you type; if you share contact details there, we may
              save them as an enquiry.
            </li>
            <li>
              <strong>How you found us:</strong> if you arrive from one of our campaign links, the campaign labels in
              that link (for example the campaign name and a campaign reference code). This is stored with your
              enquiry so we know which of our campaigns are useful. It does not identify you on its own and we do not
              use third-party advertising cookies for it.
            </li>
            <li>
              <strong>Your consent:</strong> the date and time you agreed, and which version of the consent wording you
              saw.
            </li>
          </ul>

          <h2>Why we use it</h2>
          <ul>
            <li>To reply to your enquiry and arrange or confirm a consultation.</li>
            <li>To prepare proposals and manage a project if you decide to work with us.</li>
            <li>To keep a record of our communication with you.</li>
            <li>To understand, in aggregate, which of our campaigns bring genuine enquiries.</li>
          </ul>
          <p>We do not sell your personal information, and we do not add you to marketing lists from this form.</p>

          <h2>Where it is stored</h2>
          <p>
            Your enquiry is first saved in our website database (hosted by Supabase), so it is never lost. Enquiries
            and consultation requests sent with your consent are then also stored in our customer relationship
            management system (GoHighLevel), which our team uses to follow up with you. Details shared only through the
            website assistant stay in our website database. The website is hosted by Vercel. These providers process data on our behalf and may store it
            outside Qatar. If you use the website assistant, your messages may also be processed by our AI service
            provider to generate replies.
          </p>

          <h2>Cookies and browser storage</h2>
          <p>
            This website does not use advertising or analytics cookies, tracking pixels or third-party trackers. It
            keeps two small notes in your own browser: whether you have already seen the opening animation, and, for
            the current visit only, the campaign labels from the link you arrived with (so they can be attached to an
            enquiry you choose to send). Neither contains your name or contact details.
          </p>
          <h2>How we contact you</h2>
          <p>
            A member of our team will reply personally by phone, WhatsApp or email, using the details you gave us,
            about your enquiry or consultation only. Tell us at any time if you prefer one channel or do not want
            further contact.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We keep enquiry and booking details for as long as we need them to respond to you and, if you become a
            client, to manage your project and meet our legal and accounting obligations. We are finalising a fixed
            retention period; until then we do not delete legitimate enquiries automatically, and you can ask us to
            delete your details at any time (see below).
          </p>

          <h2>Your choices and rights</h2>
          <p>
            You can ask us to access, correct or delete the personal information we hold about you, or to stop
            contacting you. Email <a href="mailto:info@openlimitsdesign.com">info@openlimitsdesign.com</a> with the
            subject &ldquo;Privacy request&rdquo; and we will respond within a reasonable time, in line with
            applicable Qatari data protection law.
          </p>

          <h2>Security</h2>
          <p>
            Access to enquiries is limited to approved Open Limits staff, and access to enquiry records is logged. We
            keep personal details out of our system logs.
          </p>

          <h2>Changes to this notice</h2>
          <p>If we change how we use your information, we will update this page and the date above.</p>

          <div className="button-row">
            <Link className="button" href="/contact">
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
