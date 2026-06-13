"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type ExteriorRevealProps = {
  phase: CinematicFilmPhase;
  finalRenderUrl?: string | null;
};

/** Golden-hour villa masterpiece — always graded, rich fallback silhouette. */
export default function ExteriorReveal({ phase, finalRenderUrl }: ExteriorRevealProps) {
  if (!phaseAtOrAfter(phase, "walkthrough")) return null;

  const active = phase === "exterior";

  return (
    <motion.div
      animate={
        active
          ? { opacity: 1, scale: 1, filter: "blur(0px)" }
          : { opacity: 0, scale: 1.04, filter: "blur(12px)" }
      }
      aria-hidden
      className="ol-film-layer ol-film-exterior"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ol-film-ext-sky" />
      <div className="ol-film-ext-sun" />
      <div className="ol-film-ext-sun-rays" />
      <div className="ol-film-ext-haze" />
      <div className="ol-film-ext-golden-grade" />

      {finalRenderUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="ol-film-ext-photo" loading="eager" src={finalRenderUrl} />
          <div className="ol-film-ext-photo-grade" />
        </>
      ) : (
        <div className="ol-film-ext-villa">
          <div className="ol-film-ext-horizon" />
          <div className="ol-film-ext-roof" />
          <div className="ol-film-ext-roof-overhang" />
          <div className="ol-film-ext-facade">
            <div className="ol-film-ext-column ol-film-ext-column-l" />
            <div className="ol-film-ext-column ol-film-ext-column-r" />
            <div className="ol-film-ext-glass-row">
              <span /><span /><span /><span /><span /><span />
            </div>
            <div className="ol-film-ext-glass-glow" />
            <div className="ol-film-ext-glow-interior" />
            <div className="ol-film-ext-entry-canopy" />
          </div>
          <div className="ol-film-ext-pool">
            <div className="ol-film-ext-pool-reflection" />
            <div className="ol-film-ext-pool-shimmer" />
          </div>
          <div className="ol-film-ext-palm ol-film-ext-palm-a" />
          <div className="ol-film-ext-palm ol-film-ext-palm-b" />
          <div className="ol-film-ext-palm ol-film-ext-palm-c" />
          <div className="ol-film-ext-landscape" />
          <div className="ol-film-ext-landscape-fg" />
        </div>
      )}

      <div className="ol-film-ext-flare" />
      <div className="ol-film-ext-flare-b" />
      <div className="ol-film-ext-vignette" />
    </motion.div>
  );
}
