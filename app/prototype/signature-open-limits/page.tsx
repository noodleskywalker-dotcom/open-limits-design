import PrototypeSignatureDemo from "@/components/prototype/PrototypeSignatureDemo";
import { getIntroSettings } from "@/lib/cms/queries";

export const metadata = {
  title: "Prototype · Signature Open Limits — Open Limits Design",
  robots: { index: false, follow: false }
};

export default async function PrototypeSignaturePage() {
  const introSettings = await getIntroSettings();

  return <PrototypeSignatureDemo finalRenderUrl={introSettings.finalRenderImageUrl} />;
}
