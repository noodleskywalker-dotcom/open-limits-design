"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import BlueprintOverlay from "@/components/prototype/film-grade/BlueprintOverlay";
import CinematicAtmosphere from "@/components/prototype/film-grade/CinematicAtmosphere";
import FilmControls from "@/components/prototype/film-grade/FilmControls";
import FilmStage from "@/components/prototype/film-grade/FilmStage";
import LogoReveal from "@/components/prototype/film-grade/LogoReveal";
import MediaSequence from "@/components/prototype/film-grade/MediaSequence";
import {
  FILM_GRADE_DURATION_MS,
  FILM_GRADE_STORAGE_KEY
} from "@/lib/prototype/film-grade-constants";
import { useFilmMediaProbe } from "@/lib/prototype/useFilmMedia";
import { useFilmTimeline } from "@/lib/prototype/useFilmTimeline";

type FilmGradeIntroProps = {
  onEnter: () => void;
  companyName?: string;
  tagline?: string;
  logoImageUrl?: string | null;
  finalRenderUrl?: string | null;
  debug?: boolean;
};

export default function FilmGradeIntro({
  onEnter,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits",
  logoImageUrl,
  finalRenderUrl,
  debug = false
}: FilmGradeIntroProps) {
  const { mounted, isMobile, reducedMotion, phase } = useFilmTimeline();
  const { statusFor, ready, missingVideos } = useFilmMediaProbe();
  const [exiting, setExiting] = useState(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      localStorage.setItem(FILM_GRADE_STORAGE_KEY, String(Date.now()));
    } catch {
      /* optional */
    }
    setExiting(true);
    window.setTimeout(onEnter, 680);
  }, [onEnter]);

  if (!mounted) {
    return <div aria-hidden className="olfg-root olfg-root-loading" />;
  }

  const showStage = phase !== "logo" && phase !== "enter";

  return (
    <div
      aria-label="Open Limits Design film-grade intro"
      className={`olfg-root ${exiting ? "olfg-root-exit" : ""} ${isMobile ? "olfg-root-mobile" : ""}`}
      data-olfg-debug={debug ? "true" : undefined}
      data-phase={phase}
    >
      <FilmStage isMobile={isMobile}>
        <MediaSequence
          finalRenderUrl={finalRenderUrl}
          isMobile={isMobile}
          phase={phase}
          statusFor={statusFor}
        />
        {showStage ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="olfg-layer olfg-blueprint-stack"
            exit={{ opacity: 0 }}
            initial={{ opacity: 1 }}
          >
            <BlueprintOverlay phase={phase} />
          </motion.div>
        ) : null}
        <CinematicAtmosphere isMobile={isMobile} phase={phase} />
      </FilmStage>

      <LogoReveal
        companyName={companyName}
        logoImageUrl={logoImageUrl}
        phase={phase}
        tagline={tagline}
      />

      <FilmControls
        onEnter={dismiss}
        onSkip={dismiss}
        showEnter={phase === "enter" || !!reducedMotion}
      />

      {debug ? (
        <aside className="prototype-timing-hud olfg-debug-hud">
          <strong>Film-grade debug</strong>
          <span>Phase: {phase}</span>
          <span>Media probe: {ready ? "ready" : "loading"}</span>
          {missingVideos.length > 0 ? (
            <span>Film-grade media missing: using poster fallback ({missingVideos.join(", ")})</span>
          ) : (
            <span>All video clips loaded</span>
          )}
          <span>CTA at {(FILM_GRADE_DURATION_MS.ctaVisible / 1000).toFixed(1)}s</span>
        </aside>
      ) : null}
    </div>
  );
}
