"use client";

import { motion } from "framer-motion";
import VillaSilhouette from "@/components/prototype/cinematic-film/VillaSilhouette";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type ExteriorRevealProps = {
  phase: CinematicFilmPhase;
  finalRenderUrl?: string | null;
};

/** HERO moment — 3s golden-hour villa launch film, slow drift, emotional peak. */
export default function ExteriorReveal({ phase, finalRenderUrl }: ExteriorRevealProps) {
  if (!phaseAtOrAfter(phase, "exterior")) return null;

  const active = phase === "exterior";

  return (
    <motion.div
      animate={
        active
          ? {
              opacity: 1,
              scale: 1.1,
              x: "-2%",
              y: "-1.5%",
              rotateY: -2,
              filter: "blur(0px)"
            }
          : { opacity: 0, scale: 1.02, filter: "blur(14px)" }
      }
      aria-hidden
      className="ol-film-layer ol-film-exterior ol-film-exterior-hero"
      initial={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ duration: 2.8, ease: [0.12, 1, 0.28, 1] }}
    >
      {/* Optional CMS texture — subtle, never dominates hero */}
      {finalRenderUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="ol-film-ext-photo-bg" loading="eager" src={finalRenderUrl} />
          <div className="ol-film-ext-photo-veil" />
        </>
      ) : null}

      <VillaSilhouette mode="hero" />

      <div aria-hidden className="ol-film-ext-hero-atmosphere">
        <div className="ol-film-ext-dust-gold" />
        <div className="ol-film-ext-lens-breathe" />
        <div className="ol-film-ext-light-streak" />
      </div>
    </motion.div>
  );
}
