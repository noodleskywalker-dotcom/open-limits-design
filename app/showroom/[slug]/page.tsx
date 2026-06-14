import Link from "next/link";
import { notFound } from "next/navigation";
import ShowroomViewer from "@/components/showroom/ShowroomViewer";
import { getShowroomImages, getShowroomSectionBySlug } from "@/lib/cms/queries";

export const revalidate = 60;

export default async function ShowroomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = await getShowroomSectionBySlug(slug);
  if (!section) notFound();

  const images = await getShowroomImages(section.id);

  return (
    <main className="showroom-page">
      <section className="section">
        <div className="container">
          <Link href="/" className="showroom-back">
            ← Back to showroom entry
          </Link>
          <p className="eyebrow">{section.title}</p>
          <h1>{section.title} Showroom</h1>
          {section.description ? <p className="lead">{section.description}</p> : null}
        </div>
      </section>
      <ShowroomViewer images={images} />
    </main>
  );
}
