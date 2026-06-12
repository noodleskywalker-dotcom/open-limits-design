import type { CompanyProfile } from "@/lib/cms/types";

const FALLBACK_ADDRESS = "Street 303, Zone 69, Building 254, Unit 303, Lusail, Qatar";

export default function OfficeLocation({ company }: { company: CompanyProfile }) {
  const address = company.address ?? FALLBACK_ADDRESS;
  const mapQuery = company.map_query ?? address;
  const phone = company.phone ?? "+974 7788 9033";
  const phone2 = company.phone2 ?? null;
  const email = company.email ?? "info@openlimitsdesign.com";

  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`;
  const whatsappUrl = `https://wa.me/${phone.replace(/\s+/g, "").replace(/^\+/, "")}`;

  return (
    <section className="location-section" id="location">
      <div className="location-inner">
        <div className="location-info">
          <p className="eyebrow">Visit Our Studio</p>
          <h2>{company.name ?? "OPEN LIMITS DESIGN"}</h2>
          <div className="location-address">
            {address.split(",").map((line) => (
              <p key={line.trim()}>{line.trim()}</p>
            ))}
          </div>
          <div className="location-contacts">
            <a className="location-contact" href={`tel:${phone.replace(/\s+/g, "")}`}>
              <span>Phone</span>
              {phone}
            </a>
            {phone2 ? (
              <a className="location-contact" href={`tel:${phone2.replace(/\s+/g, "")}`}>
                <span>Phone 2</span>
                {phone2}
              </a>
            ) : null}
            <a className="location-contact" href={`mailto:${email}`}>
              <span>Email</span>
              {email}
            </a>
          </div>
          <div className="location-actions button-row">
            <a className="button ghost" href={`tel:${phone.replace(/\s+/g, "")}`}>
              Call
            </a>
            <a className="button ghost" href={whatsappUrl} rel="noopener noreferrer" target="_blank">
              WhatsApp
            </a>
            <a className="button ghost" href={`mailto:${email}`}>
              Email
            </a>
            <a className="button" href={mapsUrl} rel="noopener noreferrer" target="_blank">
              Open in Google Maps
            </a>
            <a className="button ghost" href={directionsUrl} rel="noopener noreferrer" target="_blank">
              Get Directions
            </a>
            <a className="button ghost" href="/book-meeting-with-ceo">
              Book Consultation
            </a>
          </div>
        </div>
        <div className="location-map">
          <iframe
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={embedUrl}
            title={`Map to ${company.name ?? "Open Limits Design"}`}
          />
        </div>
      </div>
    </section>
  );
}
