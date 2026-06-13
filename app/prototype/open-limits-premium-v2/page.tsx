import PrototypePremiumV2Demo from "@/components/prototype/PrototypePremiumV2Demo";
import { getCompanyProfile, getIntroSettings } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = {
  title: "Prototype · Open Limits Premium v2 — Open Limits Design",
  robots: { index: false, follow: false }
};

export default async function PrototypeOpenLimitsPremiumV2Page() {
  const [profile, introSettings] = await Promise.all([getCompanyProfile(), getIntroSettings()]);

  return (
    <PrototypePremiumV2Demo
      companyName={profile.name}
      finalRenderUrl={introSettings.finalRenderImageUrl}
      logoImageUrl={resolveImageUrl(profile.logo_image)}
      tagline={profile.tagline ?? profile.hero_subheadline ?? "Luxury Design Studio"}
    />
  );
}
