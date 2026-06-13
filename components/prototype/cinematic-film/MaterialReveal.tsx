"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type MaterialRevealProps = {
  phase: CinematicFilmPhase;
};

/** Physical material surfaces — crossfade, no UI buttons. */
export default function MaterialReveal({ phase }: MaterialRevealProps) {
  if (!phaseAtOrAfter(phase, "structure")) return null;

  const active = phaseAtOrAfter(phase, "materials") && !phaseAtOrAfter(phase, "exterior");
  const revealing = phase === "materials";

  return (
    <motion.div
      animate={
        active
          ? { opacity: 1, filter: "blur(0px)" }
          : { opacity: 0, filter: "blur(8px)" }
      }
      aria-hidden
      className={`ol-film-layer ol-film-materials ${revealing ? "ol-film-materials-reveal" : "ol-film-materials-settled"}`}
      initial={{ opacity: 0, filter: "blur(6px)" }}
      transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ol-film-surface ol-film-surface-marble" />
      <div className="ol-film-surface ol-film-surface-wood" />
      <div className="ol-film-surface ol-film-surface-wood ol-film-surface-wood-b" />
      <div className="ol-film-surface ol-film-surface-brass" />
      <div className="ol-film-surface ol-film-surface-brass ol-film-surface-brass-v" />
      <div className="ol-film-surface ol-film-surface-brass ol-film-surface-brass-h" />
      <div className="ol-film-surface ol-film-surface-glass" />
      <div className="ol-film-surface ol-film-surface-glass-depth" />
      <div className="ol-film-surface ol-film-surface-glass-streak" />
      <div className="ol-film-surface ol-film-surface-ceiling-light" />
      <div className="ol-film-surface ol-film-surface-ceiling-glow" />
    </motion.div>
  );
}
