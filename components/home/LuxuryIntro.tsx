"use client";

import { useMemo, useSyncExternalStore, useState } from "react";
import type { IntroSettings, IntroSlide } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";

type LuxuryIntroProps = {
  slides: IntroSlide[];
  ceoImageUrl: string | null;
  logoImageUrl: string | null;
  companyName: string;
  ceoName: string;
  tagline: string;
  settings: IntroSettings;
  onRevealShowroom: () => void;
  onEnter: () => void;
};

function subscribeToHydration(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("pageshow", onStoreChange);
  return () => window.removeEventListener("pageshow", onStoreChange);
}

function getClientMounted() {
  return true;
}

function getServerMounted() {
  return false;
}

export default function LuxuryIntro({
  slides,
  ceoImageUrl,
  logoImageUrl,
  companyName,
  ceoName,
  tagline,
  settings,
  onRevealShowroom,
  onEnter
}: LuxuryIntroProps) {
  const mounted = useSyncExternalStore(subscribeToHydration, getClientMounted, getServerMounted);
  const [exiting, setExiting] = useState(false);

  const backgroundSlides = useMemo(() => {
    const urls: string[] = [];
    for (const slide of slides) {
      const url = resolveImageUrl(slide.media);
      if (url) urls.push(url);
    }
    return urls;
  }, [slides]);

  function enter() {
    setExiting(true);
    onRevealShowroom();
    window.setTimeout(onEnter, 700);
  }

  if (!mounted) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className={`luxury-intro luxury-intro-mounted ${exiting ? "luxury-intro-exit" : ""}`}
      role="dialog"
    >
      <div className="luxury-intro-backdrop">
        {backgroundSlides.map((url, index) => (
          <img
            alt=""
            aria-hidden="true"
            className={`luxury-intro-bg ${index === 0 ? "active" : ""}`}
            key={url}
            src={url}
          />
        ))}
      </div>

      <div className="luxury-intro-content">
        <div className="luxury-intro-brand">
          {logoImageUrl ? (
            <img alt={companyName} className="luxury-intro-logo-image" src={logoImageUrl} />
          ) : (
            <div className="luxury-intro-logo-text">
              <span className="logo-animated">OPEN LIMITS</span>
              <span className="logo-animated delay">DESIGN</span>
            </div>
          )}
        </div>

        <div className="luxury-intro-hero">
          {ceoImageUrl ? (
            <img alt={ceoName} className="luxury-intro-ceo" src={ceoImageUrl} />
          ) : (
            <div aria-hidden="true" className="luxury-intro-ceo luxury-intro-ceo-placeholder">
              {ceoName.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="luxury-intro-copy">
          <p className="eyebrow">{settings.introSubtitle ?? "Luxury Design Studio"}</p>
          <h1>{settings.introTitle ?? companyName}</h1>
          <p className="luxury-intro-tagline">{tagline}</p>
        </div>

        <div className="luxury-intro-actions">
          <button className="button" onClick={enter} type="button">
            Enter Showroom
          </button>
        </div>
      </div>
    </div>
  );
}
