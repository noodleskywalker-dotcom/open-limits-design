"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type InteriorWalkthroughProps = {
  phase: CinematicFilmPhase;
  isMobile: boolean;
};

/** Fake camera dolly through luxury interior — 2.5D parallax layers. */
export default function InteriorWalkthrough({ phase, isMobile }: InteriorWalkthroughProps) {
  const active = phase === "walkthrough";
  if (!active) return null;

  const scale = isMobile ? 1.22 : 1.38;
  const x = isMobile ? "-8%" : "-14%";
  const y = isMobile ? "-6%" : "-12%";
  const rotateY = isMobile ? -8 : -14;

  return (
    <motion.div
      animate={{ opacity: 1, scale, x, y, rotateY, rotateX: isMobile ? 4 : 8 }}
      aria-hidden
      className="ol-film-layer ol-film-interior"
      initial={{ opacity: 0, scale: 1, x: 0, y: 0, rotateY: 0, rotateX: 0 }}
      transition={{ duration: isMobile ? 1.4 : 1.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Depth layers — back to front */}
      <div className="ol-film-int-layer ol-film-int-sky-glow" />
      <div className="ol-film-int-layer ol-film-int-window-wall">
        <div className="ol-film-int-window-frame" />
        <div className="ol-film-int-window-frame ol-film-int-window-frame-b" />
        <div className="ol-film-int-window-light" />
      </div>
      <div className="ol-film-int-layer ol-film-int-ceiling">
        <div className="ol-film-int-light-strip" />
        <div className="ol-film-int-light-strip ol-film-int-light-strip-b" />
        <div className="ol-film-int-chandelier" />
      </div>
      <div className="ol-film-int-layer ol-film-int-back-wall" />
      <div className="ol-film-int-layer ol-film-int-sofa">
        <div className="ol-film-int-sofa-base" />
        <div className="ol-film-int-sofa-cushion" />
        <div className="ol-film-int-sofa-cushion ol-film-int-sofa-cushion-b" />
      </div>
      <div className="ol-film-int-layer ol-film-int-table">
        <div className="ol-film-int-table-top" />
        <div className="ol-film-int-table-leg" />
      </div>
      <div className="ol-film-int-layer ol-film-int-floor">
        <div className="ol-film-int-floor-reflection" />
      </div>
      <div className="ol-film-int-layer ol-film-int-rail" />
      <div className="ol-film-int-walk-light" />
    </motion.div>
  );
}
