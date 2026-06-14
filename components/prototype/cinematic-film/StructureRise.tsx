"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type StructureRiseProps = {
  phase: CinematicFilmPhase;
  isMobile: boolean;
};

/** Blueprint extrudes into architecture with crossfade transitions. */
export default function StructureRise({ phase, isMobile }: StructureRiseProps) {
  if (!phaseAtOrAfter(phase, "blueprint")) return null;

  const active = phaseAtOrAfter(phase, "structure") && !phaseAtOrAfter(phase, "brand");
  const rising = phase === "structure";

  return (
    <motion.div
      animate={
        active
          ? { opacity: 1, filter: "blur(0px)" }
          : { opacity: 0, filter: "blur(6px)" }
      }
      aria-hidden
      className={`ol-film-layer ol-film-structure ${rising ? "ol-film-structure-rising" : "ol-film-structure-settled"} ${isMobile ? "ol-film-structure-mobile" : ""}`}
      initial={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ol-film-structure-shadow" />

      <svg className="ol-film-svg ol-film-svg-structure" viewBox="0 0 1200 675">
        <g className="ol-film-extrude-guides">
          <line className="ol-film-guide" x1="180" x2="180" y1="300" y2="120" />
          <line className="ol-film-guide" x1="380" x2="380" y1="300" y2="120" />
          <line className="ol-film-guide" x1="620" x2="620" y1="300" y2="120" />
          <line className="ol-film-guide" x1="880" x2="880" y1="480" y2="200" />
          <line className="ol-film-guide" x1="1040" x2="1040" y1="480" y2="180" />
        </g>
        <g className="ol-film-walls-3d">
          <rect className="ol-film-wall ol-film-wall-living" height="120" width="200" x="180" y="180" />
          <rect className="ol-film-wall ol-film-wall-suite" height="120" width="240" x="380" y="180" />
          <rect className="ol-film-wall ol-film-wall-lower" height="120" width="200" x="180" y="300" />
          <rect className="ol-film-wall ol-film-wall-glass" height="120" width="240" x="380" y="300" />
          <polygon className="ol-film-wall ol-film-wall-elev" points="880,480 880,220 1040,180 1120,200 1120,480" />
          <rect className="ol-film-glass-plane" height="80" width="160" x="920" y="320" />
          <rect className="ol-film-glass-plane ol-film-glass-plane-b" height="60" width="120" x="400" y="320" />
          <rect className="ol-film-column" height="100" width="12" x="370" y="200" />
          <rect className="ol-film-column" height="100" width="12" x="610" y="200" />
          <rect className="ol-film-roof" height="8" width="440" x="180" y="168" />
          <polygon className="ol-film-roof ol-film-roof-elev" points="870,210 1040,170 1130,195 1130,210" />
        </g>
      </svg>

      <div className="ol-film-structure-glow" />
    </motion.div>
  );
}
