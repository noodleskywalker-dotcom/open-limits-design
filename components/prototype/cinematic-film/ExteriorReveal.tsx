"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";

type ExteriorRevealProps = {
  phase: CinematicFilmPhase;
  finalRenderUrl?: string | null;
};

/** Golden-hour villa masterpiece — CMS photo or stylized silhouette. */
export default function ExteriorReveal({ phase, finalRenderUrl }: ExteriorRevealProps) {
  const active = phase === "exterior";
  if (!active) return null;

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      aria-hidden
      className="ol-film-layer ol-film-exterior"
      initial={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="ol-film-ext-sky" />
      <div className="ol-film-ext-sun" />
      <div className="ol-film-ext-haze" />

      {finalRenderUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="ol-film-ext-photo" loading="eager" src={finalRenderUrl} />
      ) : (
        <div className="ol-film-ext-villa">
          <div className="ol-film-ext-roof" />
          <div className="ol-film-ext-facade">
            <div className="ol-film-ext-glass-row">
              <span /><span /><span /><span /><span />
            </div>
            <div className="ol-film-ext-glow-interior" />
          </div>
          <div className="ol-film-ext-pool" />
          <div className="ol-film-ext-palm ol-film-ext-palm-a" />
          <div className="ol-film-ext-palm ol-film-ext-palm-b" />
          <div className="ol-film-ext-landscape" />
        </div>
      )}

      <div className="ol-film-ext-flare" />
      <div className="ol-film-ext-vignette" />
    </motion.div>
  );
}
