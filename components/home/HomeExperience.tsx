"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { IntroSettings, IntroSlide, ShowroomSection } from "@/lib/cms/types";
import LuxuryIntro from "@/components/home/LuxuryIntro";
import ShowroomEntry from "@/components/showroom/ShowroomEntry";

const INTRO_KEY = "old-intro-seen";

function subscribeToHydration(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("pageshow", onStoreChange);
  return () => window.removeEventListener("pageshow", onStoreChange);
}

function getClientHydrated() {
  return true;
}

function getServerHydrated() {
  return false;
}

type IntroView = {
  showIntro: boolean;
  showShowroom: boolean;
};

function readIntroView(enabled: boolean): IntroView {
  const dismissed = localStorage.getItem(INTRO_KEY) === "1";
  if (!enabled || dismissed) {
    return { showIntro: false, showShowroom: true };
  }
  return { showIntro: true, showShowroom: false };
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
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientHydrated, getServerHydrated);
  const [override, setOverride] = useState<Partial<IntroView>>({});

  const baseView = useMemo((): IntroView => {
    if (!hydrated) {
      return { showIntro: false, showShowroom: false };
    }
    return readIntroView(settings.enabled);
  }, [hydrated, settings.enabled]);

  const showIntro = override.showIntro ?? baseView.showIntro;
  const showShowroom = override.showShowroom ?? baseView.showShowroom;

  const revealShowroom = useCallback(() => {
    setOverride((current) => ({ ...current, showShowroom: true }));
  }, []);

  const completeIntro = useCallback(() => {
    localStorage.setItem(INTRO_KEY, "1");
    setOverride({ showIntro: false, showShowroom: true });
  }, []);

  if (!hydrated) {
    return null;
  }

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
      {showShowroom ? (
        <main className="showroom-entry-reveal visible">
          <ShowroomEntry sections={sections} />
        </main>
      ) : null}
    </>
  );
}
