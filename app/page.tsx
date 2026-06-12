import HomeExperience from "@/components/home/HomeExperience";
import { getCompanyProfile, getIntroSettings, getIntroSlides, getShowroomSections } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const revalidate = 60;

export default async function HomePage() {
  const [profile, introSlides, showroomSections, introSettings] = await Promise.all([
    getCompanyProfile(),
    getIntroSlides(),
    getShowroomSections(),
    getIntroSettings()
  ]);

  return (
    <HomeExperience
      ceoImageUrl={resolveImageUrl(profile.ceo_image)}
      ceoName={profile.ceo_name ?? profile.name}
      companyName={profile.name}
      logoImageUrl={resolveImageUrl(profile.logo_image)}
      sections={showroomSections}
      settings={introSettings}
      slides={introSlides}
      tagline={profile.tagline ?? profile.hero_subheadline ?? "Luxury Design Studio"}
    />
  );
}
