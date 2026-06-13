"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type InteriorWalkthroughProps = {
  phase: CinematicFilmPhase;
  isMobile: boolean;
};

/** Luxury interior dolly — multi-layer parallax, warmer light, slower camera. */
export default function InteriorWalkthrough({ phase, isMobile }: InteriorWalkthroughProps) {
  if (!phaseAtOrAfter(phase, "materials")) return null;

  const active = phase === "walkthrough";
  const dollyDuration = isMobile ? 2.6 : 3.4;
  const dollyScale = isMobile ? 1.18 : 1.26;
  const dollyX = isMobile ? "-6%" : "-11%";
  const dollyY = isMobile ? "-5%" : "-9%";
  const dollyRotateY = isMobile ? -6 : -11;

  return (
    <motion.div
      animate={
        active
          ? { opacity: 1, scale: dollyScale, x: dollyX, y: dollyY, rotateY: dollyRotateY, rotateX: isMobile ? 3 : 6, filter: "blur(0px)" }
          : { opacity: 0, scale: 1, x: 0, y: 0, rotateY: 0, rotateX: 0, filter: "blur(10px)" }
      }
      aria-hidden
      className="ol-film-layer ol-film-interior"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: dollyDuration, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={active ? { x: "-3%", y: "-1%" } : { x: 0, y: 0 }}
        className="ol-film-int-parallax ol-film-int-parallax-far"
        transition={{ duration: dollyDuration, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ol-film-int-warm-ambient" />
        <div className="ol-film-int-back-wall">
          <div className="ol-film-int-wood-slats" />
          <div className="ol-film-int-brass-rail" />
        </div>
      </motion.div>

      <motion.div
        animate={active ? { x: "-6%", y: "-2%" } : { x: 0, y: 0 }}
        className="ol-film-int-parallax ol-film-int-parallax-mid"
        transition={{ duration: dollyDuration, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ol-film-int-window-wall">
          <div className="ol-film-int-glass-depth">
            <div className="ol-film-int-glass-pane" />
            <div className="ol-film-int-glass-pane ol-film-int-glass-pane-b" />
            <div className="ol-film-int-glass-reflection" />
          </div>
          <div className="ol-film-int-window-mullion" />
          <div className="ol-film-int-window-light" />
        </div>
      </motion.div>

      <motion.div
        animate={active ? { x: "-9%", y: "-3%" } : { x: 0, y: 0 }}
        className="ol-film-int-parallax ol-film-int-parallax-near"
        transition={{ duration: dollyDuration, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ol-film-int-ceiling">
          <div className="ol-film-int-light-strip" />
          <div className="ol-film-int-light-strip ol-film-int-light-strip-b" />
          <div className="ol-film-int-light-strip ol-film-int-light-strip-c" />
          <div className="ol-film-int-chandelier" />
          <div className="ol-film-int-chandelier-glow" />
        </div>

        <div className="ol-film-int-sofa">
          <div className="ol-film-int-sofa-shadow" />
          <div className="ol-film-int-sofa-base" />
          <div className="ol-film-int-sofa-arm ol-film-int-sofa-arm-l" />
          <div className="ol-film-int-sofa-arm ol-film-int-sofa-arm-r" />
          <div className="ol-film-int-sofa-cushion" />
          <div className="ol-film-int-sofa-cushion ol-film-int-sofa-cushion-b" />
          <div className="ol-film-int-sofa-cushion ol-film-int-sofa-cushion-back" />
        </div>

        <div className="ol-film-int-table">
          <div className="ol-film-int-table-top" />
          <div className="ol-film-int-table-leg ol-film-int-table-leg-l" />
          <div className="ol-film-int-table-leg ol-film-int-table-leg-r" />
          <div className="ol-film-int-table-brass" />
        </div>
      </motion.div>

      <motion.div
        animate={active ? { x: "-12%", y: "-4%" } : { x: 0, y: 0 }}
        className="ol-film-int-parallax ol-film-int-parallax-floor"
        transition={{ duration: dollyDuration, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ol-film-int-floor">
          <div className="ol-film-int-marble-vein" />
          <div className="ol-film-int-marble-vein ol-film-int-marble-vein-b" />
          <div className="ol-film-int-floor-reflection" />
          <div className="ol-film-int-floor-specular" />
        </div>
        <div className="ol-film-int-brass-baseboard" />
      </motion.div>

      <div className="ol-film-int-walk-light" />
      <div className="ol-film-int-dust-walk" />
    </motion.div>
  );
}
