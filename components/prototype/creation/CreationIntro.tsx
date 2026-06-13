"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import CreationBlueprintSvg from "@/components/prototype/creation/CreationBlueprintSvg";
import CreationBrandMorph from "@/components/prototype/creation/CreationBrandMorph";
import CreationControls from "@/components/prototype/creation/CreationControls";
import CreationVillaAtmosphere from "@/components/prototype/creation/CreationVillaAtmosphere";
import {
  CREATION_DURATION_MS,
  CREATION_STORAGE_KEY,
  creationPhaseAtOrAfter
} from "@/lib/prototype/creation/creation-constants";
import { useCreationTimeline } from "@/lib/prototype/useCreationTimeline";

const CreationCanvas = dynamic(() => import("@/components/prototype/creation/CreationCanvas"), {
  ssr: false
});

type CreationIntroProps = {
  onEnter: () => void;
  companyName?: string;
  tagline?: string;
  debug?: boolean;
};

/**
 * Creation-first intro — zero photos, zero videos.
 * Blueprint → extruded architecture → brand morph.
 */
export default function CreationIntro({
  onEnter,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits",
  debug = false
}: CreationIntroProps) {
  const { mounted, isMobile, reducedMotion, phase, elapsed } = useCreationTimeline();
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

  const showVillaAtmosphere =
    creationPhaseAtOrAfter(phase, "villa") && phase !== "brand" && phase !== "enter";

  if (!mounted) {
    return <div aria-hidden className="olcrt-root olcrt-root-loading" />;
  }

  return (
    <div
      aria-label="Open Limits Design creation intro"
      className={`olcrt-root ${exiting ? "olcrt-root-exit" : ""} ${isMobile ? "olcrt-root-mobile" : ""}`}
      data-olcrt-debug={debug ? "true" : undefined}
      data-phase={phase}
    >
      <div className={`olcrt-stage-wrap ${isMobile ? "olcrt-stage-wrap-mobile" : ""}`}>
        <div className="olcrt-stage">
          <div aria-hidden className="olcrt-black-base" />

          <CreationCanvas elapsed={elapsed} isMobile={isMobile} phase={phase} />

          <CreationBlueprintSvg elapsed={elapsed} phase={phase} />

          {showVillaAtmosphere ? (
            <CreationVillaAtmosphere elapsed={elapsed} isMobile={isMobile} phase={phase} />
          ) : null}

          <CreationBrandMorph
            companyName={companyName}
            elapsed={elapsed}
            phase={phase}
            tagline={tagline}
          />
        </div>
      </div>

      <CreationControls
        onEnter={dismiss}
        onSkip={dismiss}
        showEnter={phase === "enter" || !!reducedMotion}
      />

      {debug ? (
        <aside className="prototype-timing-hud olcrt-debug-hud">
          <strong>Creation intro debug</strong>
          <span>Phase: {phase}</span>
          <span>Elapsed: {(elapsed / 1000).toFixed(1)}s</span>
          <span>Media: none (creation-first)</span>
          <span>CTA at {(CREATION_DURATION_MS.ctaVisible / 1000).toFixed(1)}s</span>
        </aside>
      ) : null}
    </div>
  );
}
