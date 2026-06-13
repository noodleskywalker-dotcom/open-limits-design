import PrototypeCinematicDemo from "@/components/prototype/PrototypeCinematicDemo";
import { getCompanyProfile, getIntroSettings } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = {
  title: "Prototype · Current Cinematic — Open Limits Design",
  robots: { index: false, follow: false }
};

export default async function PrototypeCurrentCinematicPage() {
  const [profile, introSettings] = await Promise.all([getCompanyProfile(), getIntroSettings()]);

  return (
    <PrototypeCinematicDemo
      companyName={profile.name}
      finalRenderUrl={introSettings.finalRenderImageUrl}
      logoImageUrl={resolveImageUrl(profile.logo_image)}
      tagline={profile.tagline ?? profile.hero_subheadline ?? "Luxury Design Studio"}
    />
  );
}
