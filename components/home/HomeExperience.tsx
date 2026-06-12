"use client";

import { useCallback, useState } from "react";
import type { IntroSettings, IntroSlide, ShowroomSection } from "@/lib/cms/types";
import LuxuryIntro from "@/components/home/LuxuryIntro";
import ShowroomEntry from "@/components/showroom/ShowroomEntry";

const INTRO_KEY = "old-intro-seen";

function readIntroState(enabled: boolean) {
  if (typeof window === "undefined") {
    return { showIntro: false, showroomReady: true };
  }
  const seen = localStorage.getItem(INTRO_KEY) === "1";
  if (!enabled || seen) {
    return { showIntro: false, showroomReady: true };
  }
  return { showIntro: true, showroomReady: false };
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
  const [showIntro, setShowIntro] = useState(() => readIntroState(settings.enabled).showIntro);
  const [showroomReady, setShowroomReady] = useState(() => readIntroState(settings.enabled).showroomReady);

  const revealShowroom = useCallback(() => {
    setShowroomReady(true);
  }, []);

  const completeIntro = useCallback(() => {
    localStorage.setItem(INTRO_KEY, "1");
    setShowIntro(false);
  }, []);

  return (
    <>
      {showIntro ? (
        <LuxuryIntro
          ceoImageUrl={ceoImageUrl}
          ceoName={ceoName}
          companyName={companyName}
          logoImageUrl={logoImageUrl}
          onEnter={completeIntro}
          onRevealShowroom={revealShowroom}
          settings={settings}
          slides={slides}
          tagline={tagline}
        />
      ) : null}
      {showroomReady ? (
        <main className="showroom-entry-reveal visible">
          <ShowroomEntry sections={sections} />
        </main>
      ) : null}
    </>
  );
}
