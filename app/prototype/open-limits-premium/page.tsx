import PrototypePremiumDemo from "@/components/prototype/PrototypePremiumDemo";
import { getCompanyProfile, getIntroSettings } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = {
  title: "Prototype · Open Limits Premium — Open Limits Design",
  robots: { index: false, follow: false }
};

export default async function PrototypeOpenLimitsPremiumPage() {
  const [profile, introSettings] = await Promise.all([getCompanyProfile(), getIntroSettings()]);

  return (
    <PrototypePremiumDemo
      companyName={profile.name}
      finalRenderUrl={introSettings.finalRenderImageUrl}
      introSettings={introSettings}
      logoImageUrl={resolveImageUrl(profile.logo_image)}
      tagline={profile.tagline ?? profile.hero_subheadline ?? "Luxury Design Studio"}
    />
  );
}
