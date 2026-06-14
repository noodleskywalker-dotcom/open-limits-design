import { getCompanyProfile } from "@/lib/cms/queries";
import OfficeLocation from "@/components/location/OfficeLocation";

export const revalidate = 60;

export const metadata = {
  title: "Location — Open Limits Design",
  description: "Visit the Open Limits Design studio in Lusail, Qatar."
};

export default async function LocationPage() {
  const company = await getCompanyProfile();

  return (
    <main className="page location-page">
      <section className="section container">
        <p className="eyebrow">Studio</p>
        <h1>Location</h1>
        <p className="lead">
          Visit our design studio in Lusail. Address, map, and contact details are managed from Admin →
          Homepage.
        </p>
      </section>
      <OfficeLocation company={company} />
    </main>
  );
}
