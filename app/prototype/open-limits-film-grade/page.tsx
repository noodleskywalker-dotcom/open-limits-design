import PrototypeFilmGradeDemo from "@/components/prototype/PrototypeFilmGradeDemo";
import { getCompanyProfile, getIntroSettings } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = {
  title: "Prototype · Open Limits Film Grade — Open Limits Design",
  robots: { index: false, follow: false }
};

export default async function PrototypeOpenLimitsFilmGradePage({
  searchParams
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const [profile, introSettings, params] = await Promise.all([
    getCompanyProfile(),
    getIntroSettings(),
    searchParams
  ]);
  const debug = params.debug === "1";

  return (
    <PrototypeFilmGradeDemo
      companyName={profile.name}
      debug={debug}
      finalRenderUrl={introSettings.finalRenderImageUrl}
      logoImageUrl={resolveImageUrl(profile.logo_image)}
      tagline={profile.tagline ?? "Design Without Limits"}
    />
  );
}
