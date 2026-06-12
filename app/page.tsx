import HomeExperience from "@/components/home/HomeExperience";
import { getCompanyProfile, getIntroSettings, getShowroomSections } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const revalidate = 60;

export default async function HomePage() {
  const [profile, showroomSections, introSettings] = await Promise.all([
    getCompanyProfile(),
    getShowroomSections(),
    getIntroSettings()
  ]);

  return (
    <HomeExperience
      companyName={profile.name}
      logoImageUrl={resolveImageUrl(profile.logo_image)}
      sections={showroomSections}
      settings={introSettings}
      tagline={profile.tagline ?? profile.hero_subheadline ?? "Luxury Design Studio"}
    />
  );
}
