"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import CreationControls from "@/components/prototype/creation/CreationControls";
import CreationFilmLabels from "@/components/prototype/creation/CreationFilmLabels";
import CreationFilmPencil from "@/components/prototype/creation/CreationFilmPencil";
import CreationVillaAtmosphere from "@/components/prototype/creation/CreationVillaAtmosphere";
import {
  CREATION_DURATION_MS,
  CREATION_STORAGE_KEY,
  filmBeatAtOrAfter
} from "@/lib/prototype/creation/creation-constants";
import { useCreationTimeline } from "@/lib/prototype/useCreationTimeline";

const CreationFilmCanvas = dynamic(
  () => import("@/components/prototype/creation/CreationFilmCanvas"),
  { ssr: false }
);

type CreationIntroProps = {
  onEnter: () => void;
  companyName?: string;
  debug?: boolean;
};

/**
 * Architectural creation film — one geometry, one canvas, one transformation.
 * Zero photos. Zero videos.
 */
export default function CreationIntro({
  onEnter,
  companyName = "Open Limits Design",
  debug = false
}: CreationIntroProps) {
  const { mounted, isMobile, reducedMotion, phase: beat, elapsed } = useCreationTimeline();
  const [exiting, setExiting] = useState(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      localStorage.setItem(CREATION_STORAGE_KEY, String(Date.now()));
    } catch {
      /* optional */
    }
    setExiting(true);
    window.setTimeout(onEnter, 680);
  }, [onEnter]);

  const showAtmosphere = beat === "architecture";
  const showEnd = beat === "end" || !!reducedMotion;
  const showSkip = elapsed > 2000;

  if (!mounted) {
    return <div aria-hidden className="olcrt-root olcrt-root-loading" />;
  }

  return (
    <div
      aria-label="Open Limits Design creation film"
      className={`olcrt-root olcrt-film-root ${exiting ? "olcrt-root-exit" : ""} ${isMobile ? "olcrt-root-mobile" : ""}`}
      data-beat={beat}
      data-elapsed={Math.round(elapsed)}
      data-olcrt-debug={debug ? "true" : undefined}
      data-phase={beat}
    >
      <div className={`olcrt-stage-wrap ${isMobile ? "olcrt-stage-wrap-mobile" : ""}`}>
        <div className="olcrt-stage olcrt-film-stage">
          <div aria-hidden className="olcrt-black-base" />

          <CreationFilmCanvas beat={beat} elapsed={elapsed} isMobile={isMobile} />

          <CreationFilmLabels beat={beat} elapsed={elapsed} />

          <CreationFilmPencil elapsed={elapsed} />

          {showAtmosphere ? (
            <CreationVillaAtmosphere elapsed={elapsed} isMobile={isMobile} phase={beat} />
          ) : null}

          {showEnd ? (
            <div aria-hidden className="olcrt-film-end">
              <h1 className="olcrt-film-title">{companyName.toUpperCase()}</h1>
            </div>
          ) : null}
        </div>
      </div>

      {showSkip ? (
        <CreationControls onEnter={dismiss} onSkip={dismiss} showEnter={showEnd} />
      ) : null}

      {debug ? (
        <aside className="prototype-timing-hud olcrt-debug-hud">
          <strong>Creation film debug</strong>
          <span>Beat: {beat}</span>
          <span>Elapsed: {(elapsed / 1000).toFixed(1)}s</span>
          <span>Media: none</span>
          <span>End at {(CREATION_DURATION_MS.ctaVisible / 1000).toFixed(1)}s</span>
        </aside>
      ) : null}
    </div>
  );
}
