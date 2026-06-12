"use client";

import { useCallback, useState } from "react";
import type { IntroSettings, IntroSlide, ShowroomSection } from "@/lib/cms/types";
import LuxuryIntro from "@/components/home/LuxuryIntro";
import ShowroomEntry from "@/components/showroom/ShowroomEntry";

const INTRO_KEY = "old-intro-seen";

function readIntroState(enabled: boolean) {
  if (typeof window === "undefined") {
    return { introVisible: false, showroomReady: true };
  }
  const seen = localStorage.getItem(INTRO_KEY) === "1";
  if (!enabled || seen) {
    return { introVisible: false, showroomReady: true };
  }
  return { introVisible: true, showroomReady: false };
}

type HomeExperienceProps = {
  slides: IntroSlide[];
  ceoImageUrl: string | null;
  logoImageUrl: string | null;
  companyName: string;
  ceoName: string;
  tagline: string;
  settings: IntroSettings;
  sections: ShowroomSection[];
};

export default function HomeExperience({
  slides,
  ceoImageUrl,
  logoImageUrl,
  companyName,
  ceoName,
  tagline,
  settings,
  sections
}: HomeExperienceProps) {
  const [introVisible, setIntroVisible] = useState(() => readIntroState(settings.enabled).introVisible);
  const [showroomReady, setShowroomReady] = useState(() => readIntroState(settings.enabled).showroomReady);

  const enterShowroom = useCallback(() => {
    localStorage.setItem(INTRO_KEY, "1");
    setIntroVisible(false);
    window.setTimeout(() => setShowroomReady(true), 700);
  }, []);

  return (
    <>
      {introVisible ? (
        <LuxuryIntro
          ceoImageUrl={ceoImageUrl}
          ceoName={ceoName}
          companyName={companyName}
          logoImageUrl={logoImageUrl}
          onEnter={enterShowroom}
          settings={settings}
          slides={slides}
          tagline={tagline}
        />
      ) : null}
      {showroomReady ? (
        <main className={`showroom-entry-reveal ${introVisible ? "" : "visible"}`}>
          <ShowroomEntry sections={sections} />
        </main>
      ) : null}
    </>
  );
}
