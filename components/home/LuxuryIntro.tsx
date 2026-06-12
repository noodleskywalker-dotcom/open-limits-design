"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { IntroSettings } from "@/lib/cms/types";
import BlueprintSvgFallback from "@/components/home/BlueprintSvgFallback";

type LuxuryIntroProps = {
  logoImageUrl: string | null;
  companyName: string;
  tagline: string;
  settings: IntroSettings;
  onRevealShowroom: () => void;
  onEnter: () => void;
};

type IntroPhase = "dark" | "draw" | "transform" | "reveal";

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
  logoImageUrl,
  companyName,
  tagline,
  settings,
  onRevealShowroom,
  onEnter
}: LuxuryIntroProps) {
  const mounted = useSyncExternalStore(subscribeToHydration, getClientMounted, getServerMounted);
  const [phase, setPhase] = useState<IntroPhase>("dark");
  const [exiting, setExiting] = useState(false);

  const blueprintUrl = settings.blueprintImageUrl;
  const finalUrl = settings.finalRenderImageUrl;
  const reducedMotion =
    mounted && typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const displayPhase = !mounted ? "dark" : reducedMotion ? "reveal" : phase;

  useEffect(() => {
    if (!mounted || reducedMotion) return;

    const timers = [
      window.setTimeout(() => setPhase("draw"), 500),
      window.setTimeout(() => setPhase("transform"), 3200),
      window.setTimeout(() => setPhase("reveal"), 5200)
    ];
    return () => timers.forEach(clearTimeout);
  }, [mounted, reducedMotion]);

  function dismiss() {
    setExiting(true);
    onRevealShowroom();
    window.setTimeout(onEnter, 650);
  }

  if (!mounted) {
    return null;
  }

  const title = settings.introTitle ?? companyName;
  const subtitle = settings.introSubtitle ?? tagline;

  return (
    <div
      aria-modal="true"
      aria-label="Open Limits Design intro"
      className={`luxury-intro blueprint-intro luxury-intro-mounted ${exiting ? "luxury-intro-exit" : ""}`}
      data-phase={displayPhase}
      role="dialog"
    >
      <div aria-hidden className="blueprint-intro-backdrop" />

      <div className="blueprint-stage">
        <div className="blueprint-paper">
          {blueprintUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="blueprint-cms-image blueprint-layer" src={blueprintUrl} />
          ) : (
            <BlueprintSvgFallback />
          )}

          {finalUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="blueprint-final-image blueprint-layer" src={finalUrl} />
          ) : (
            <div aria-hidden className="blueprint-final-fallback blueprint-layer">
              <div className="blueprint-final-glow" />
              <div className="blueprint-final-room" />
            </div>
          )}
        </div>
      </div>

      <div className="blueprint-intro-ui">
        <div className="blueprint-intro-brand">
          {logoImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={companyName} className="luxury-intro-logo-image" src={logoImageUrl} />
          ) : (
            <div className="luxury-intro-logo-text">
              <span className="logo-animated">OPEN LIMITS</span>
              <span className="logo-animated delay">DESIGN</span>
            </div>
          )}
        </div>

        <div className="blueprint-intro-copy">
          <p className="eyebrow">{subtitle}</p>
          <h1>{title}</h1>
        </div>

        <div className="luxury-intro-actions">
          <button className="button" onClick={dismiss} type="button">
            Enter Showroom
          </button>
          <button className="button ghost" onClick={dismiss} type="button">
            Skip Intro
          </button>
        </div>
      </div>
    </div>
  );
}
