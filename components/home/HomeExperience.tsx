"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { IntroSettings, ShowroomSection } from "@/lib/cms/types";
import LuxuryIntro from "@/components/home/LuxuryIntro";
import ShowroomEntry from "@/components/showroom/ShowroomEntry";
import { INTRO_STORAGE_KEY } from "@/lib/intro/constants";

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
  const dismissed = localStorage.getItem(INTRO_STORAGE_KEY) === "1";
  if (!enabled || dismissed) {
    return { showIntro: false, showShowroom: true };
  }
  return { showIntro: true, showShowroom: false };
}

type HomeExperienceProps = {
  logoImageUrl: string | null;
  companyName: string;
  tagline: string;
  settings: IntroSettings;
  sections: ShowroomSection[];
};

export default function HomeExperience({
  logoImageUrl,
  companyName,
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
    localStorage.setItem(INTRO_STORAGE_KEY, "1");
    setOverride({ showIntro: false, showShowroom: true });
  }, []);

  if (!hydrated) {
    return null;
  }

  return (
    <>
      {showIntro ? (
        <LuxuryIntro
          companyName={companyName}
          logoImageUrl={logoImageUrl}
          onEnter={completeIntro}
          onRevealShowroom={revealShowroom}
          settings={settings}
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
