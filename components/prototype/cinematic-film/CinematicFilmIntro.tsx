"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import BlueprintDraw from "@/components/prototype/cinematic-film/BlueprintDraw";
import CinematicFilmEffects from "@/components/prototype/cinematic-film/CinematicFilmEffects";
import CinematicTransitionBloom from "@/components/prototype/cinematic-film/CinematicTransitionBloom";
import ExteriorReveal from "@/components/prototype/cinematic-film/ExteriorReveal";
import InteriorWalkthrough from "@/components/prototype/cinematic-film/InteriorWalkthrough";
import LogoMorph from "@/components/prototype/cinematic-film/LogoMorph";
import MaterialReveal from "@/components/prototype/cinematic-film/MaterialReveal";
import StructureRise from "@/components/prototype/cinematic-film/StructureRise";
import {
  CINEMATIC_FILM_DURATION_MS,
  CINEMATIC_FILM_PHASE_START_MS,
  CINEMATIC_FILM_STORAGE_KEY,
  phaseAtOrAfter
} from "@/lib/prototype/cinematic-film-constants";
import { useCinematicFilmPhaseEngine } from "@/lib/prototype/useCinematicFilmPhaseEngine";

type CinematicFilmIntroProps = {
  onEnter: () => void;
  companyName?: string;
  tagline?: string;
  logoImageUrl?: string | null;
  finalRenderUrl?: string | null;
  debug?: boolean;
};

function cameraForPhase(phase: string, isMobile: boolean) {
  switch (phase) {
    case "structure":
      return { rotateX: isMobile ? 12 : 18, scale: 1.02, y: "-1%" };
    case "materials":
      return { rotateX: isMobile ? 8 : 12, scale: 1.03, y: "-2%" };
    case "walkthrough":
      return { rotateX: isMobile ? 5 : 8, scale: 1.05, y: "-3%" };
    case "exterior":
      return { rotateX: 0, scale: 1.06, y: 0 };
    default:
      return { rotateX: 0, scale: 1, y: 0 };
  }
}

export default function CinematicFilmIntro({
  onEnter,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits",
  logoImageUrl,
  finalRenderUrl,
  debug = false
}: CinematicFilmIntroProps) {
  const { mounted, isMobile, reducedMotion, phase } = useCinematicFilmPhaseEngine();
  const [exiting, setExiting] = useState(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      localStorage.setItem(CINEMATIC_FILM_STORAGE_KEY, String(Date.now()));
    } catch {
      /* optional */
    }
    setExiting(true);
    window.setTimeout(onEnter, 680);
  }, [onEnter]);

  if (!mounted) {
    return <div aria-hidden className="ol-film-root ol-film-root-loading" />;
  }

  const showStage = !phaseAtOrAfter(phase, "brand");
  const cam = cameraForPhase(phase, isMobile);

  return (
    <div
      aria-label="Open Limits Design cinematic architecture film"
      className={`ol-film-root ${exiting ? "ol-film-root-exit" : ""} ${isMobile ? "ol-film-root-mobile" : ""}`}
      data-ol-film-debug={debug ? "true" : undefined}
      data-phase={phase}
    >
      <CinematicFilmEffects isMobile={isMobile} phase={phase} />
      <CinematicTransitionBloom phase={phase} />

      <AnimatePresence mode="wait">
        {showStage ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="ol-film-stage-outer"
            exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
            initial={{ opacity: 1 }}
            key="stage"
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              animate={cam}
              className="ol-film-stage-camera"
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="ol-film-stage">
                <BlueprintDraw phase={phase} />
                <StructureRise isMobile={isMobile} phase={phase} />
                <MaterialReveal phase={phase} />
                <InteriorWalkthrough isMobile={isMobile} phase={phase} />
                <ExteriorReveal finalRenderUrl={finalRenderUrl} phase={phase} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <LogoMorph
        companyName={companyName}
        logoImageUrl={logoImageUrl}
        phase={phase}
        tagline={tagline}
      />

      <AnimatePresence>
        {phase === "enter" && !reducedMotion ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="ol-film-enter"
            initial={{ opacity: 0, y: 16 }}
            key="enter"
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="ol-film-enter-btn" onClick={dismiss} type="button">
              Enter Experience
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {reducedMotion ? (
        <div className="ol-film-enter">
          <button className="ol-film-enter-btn" onClick={dismiss} type="button">
            Enter Experience
          </button>
        </div>
      ) : null}

      <button className="prototype-skip-fab ol-film-skip" onClick={dismiss} type="button">
        Skip
      </button>

      {debug ? (
        <aside className="prototype-timing-hud ol-film-debug-hud">
          <strong>Cinematic film debug</strong>
          <span>Phase: {phase}</span>
          <span>CTA at {(CINEMATIC_FILM_PHASE_START_MS.enter / 1000).toFixed(1)}s</span>
          <span>Total ~{(CINEMATIC_FILM_DURATION_MS.total / 1000).toFixed(1)}s</span>
        </aside>
      ) : null}
    </div>
  );
}
