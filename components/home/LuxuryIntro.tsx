"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { IntroSettings } from "@/lib/cms/types";

type LuxuryIntroProps = {
  logoImageUrl: string | null;
  companyName: string;
  tagline: string;
  settings: IntroSettings;
  onRevealShowroom: () => void;
  onEnter: () => void;
};

/** Full intro sequence — paper → draw → structure → render → glow → logo + CTA */
type IntroPhase = "dark" | "paper" | "draw" | "structure" | "transform" | "glow" | "reveal";

const PHASE_MS = {
  paper: 450,
  draw: 1100,
  structure: 3100,
  transform: 4300,
  glow: 5600,
  reveal: 6200
} as const;

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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Inline SVG blueprint — used when no CMS blueprint image is uploaded. */
function BlueprintDrawing() {
  return (
    <svg
      aria-hidden
      className="blueprint-svg-fallback"
      viewBox="0 0 420 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="blueprint-lines">
        <rect className="bp-fill bp-fill-main" height="220" rx="2" width="340" x="40" y="40" />
        <rect className="bp-fill bp-fill-room" height="60" width="60" x="120" y="40" />
        <rect className="bp-fill bp-fill-wing" height="100" width="180" x="120" y="160" />
        <rect className="bp-stroke bp-outer" height="220" rx="2" width="340" x="40" y="40" />
        <path className="bp-stroke bp-wall-v" d="M210 40 L210 160" />
        <path className="bp-stroke bp-wall-h" d="M40 160 L380 160" />
        <path className="bp-stroke bp-wall-v2" d="M120 160 L120 260" />
        <path className="bp-stroke bp-wall-v3" d="M300 160 L300 260" />
        <path className="bp-stroke bp-room" d="M120 40 L120 100 L180 100 L180 40 Z" />
        <path className="bp-stroke bp-door" d="M300 160 A 28 28 0 0 1 328 188" />
        <circle className="bp-stroke bp-dot" cx="80" cy="80" r="4" />
        <circle className="bp-stroke bp-dot2" cx="340" cy="220" r="4" />
        <path className="bp-stroke bp-detail" d="M40 260 L380 260" />
      </g>
    </svg>
  );
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

  const reducedMotion = mounted && prefersReducedMotion();
  const displayPhase: IntroPhase = !mounted ? "dark" : reducedMotion ? "reveal" : phase;

  useEffect(() => {
    if (!mounted || reducedMotion) return;

    const timers = (Object.entries(PHASE_MS) as [IntroPhase, number][]).map(([step, ms]) =>
      window.setTimeout(() => setPhase(step), ms)
    );
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
      aria-label="Open Limits Design intro"
      aria-modal="true"
      className={`luxury-intro blueprint-intro luxury-intro-mounted ${exiting ? "luxury-intro-exit" : ""}`}
      data-phase={displayPhase}
      role="dialog"
    >
      <div aria-hidden className="blueprint-intro-backdrop" />
      <div aria-hidden className="blueprint-gold-glow" />

      <div className="blueprint-stage">
        <div className="blueprint-paper">
          {blueprintUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="blueprint-cms-image blueprint-layer" src={blueprintUrl} />
          ) : (
            <BlueprintDrawing />
          )}

          {finalUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="blueprint-final-image blueprint-layer" src={finalUrl} />
          ) : (
            <div aria-hidden className="blueprint-final-fallback blueprint-layer">
              <div className="blueprint-final-glow" />
              <div className="blueprint-final-room" />
              <div className="blueprint-final-window" />
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
