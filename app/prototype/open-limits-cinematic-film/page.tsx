import PrototypeCinematicFilmDemo from "@/components/prototype/PrototypeCinematicFilmDemo";
import { getCompanyProfile, getIntroSettings } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = {
  title: "Prototype · Open Limits Cinematic Film — Open Limits Design",
  robots: { index: false, follow: false }
};

export default async function PrototypeOpenLimitsCinematicFilmPage({
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
    <PrototypeCinematicFilmDemo
      companyName={profile.name}
      debug={debug}
      finalRenderUrl={introSettings.finalRenderImageUrl}
      logoImageUrl={resolveImageUrl(profile.logo_image)}
      tagline={profile.tagline ?? "Design Without Limits"}
    />
  );
}
