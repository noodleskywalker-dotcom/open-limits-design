import type { CompanyProfile } from "@/lib/cms/types";

const FALLBACK_ADDRESS = "Street 303, Zone 69, Building 254, Unit 303, Lusail, Qatar";

export default function OfficeLocation({ company }: { company: CompanyProfile }) {
  const address = company.address ?? FALLBACK_ADDRESS;
  const mapQuery = company.map_query ?? address;
  const phone = company.phone ?? "+974 7788 9033";
  const email = company.email ?? "info@openlimitsdesign.com";

  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`;

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
            <a className="location-contact" href={`mailto:${email}`}>
              <span>Email</span>
              {email}
            </a>
          </div>
          <a className="button" href={directionsUrl} rel="noopener noreferrer" target="_blank">
            Get Directions
          </a>
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
