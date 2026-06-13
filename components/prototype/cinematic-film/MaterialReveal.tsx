"use client";

import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type MaterialRevealProps = {
  phase: CinematicFilmPhase;
};

/** Physical material surfaces — no UI buttons. */
export default function MaterialReveal({ phase }: MaterialRevealProps) {
  const active = phaseAtOrAfter(phase, "materials") && !phaseAtOrAfter(phase, "exterior");
  if (!active) return null;

  const revealing = phase === "materials";
  const interior = phaseAtOrAfter(phase, "walkthrough");

  return (
    <div
      aria-hidden
      className={`ol-film-layer ol-film-materials ${revealing ? "ol-film-materials-reveal" : ""} ${interior ? "ol-film-materials-settled" : ""}`}
    >
      {/* Marble floor */}
      <div className="ol-film-surface ol-film-surface-marble" />
      {/* Wood wall panels */}
      <div className="ol-film-surface ol-film-surface-wood" />
      <div className="ol-film-surface ol-film-surface-wood ol-film-surface-wood-b" />
      {/* Brass trim */}
      <div className="ol-film-surface ol-film-surface-brass" />
      <div className="ol-film-surface ol-film-surface-brass ol-film-surface-brass-v" />
      {/* Glass reflection */}
      <div className="ol-film-surface ol-film-surface-glass" />
      <div className="ol-film-surface ol-film-surface-glass-streak" />
      {/* Ceiling light */}
      <div className="ol-film-surface ol-film-surface-ceiling-light" />
      <div className="ol-film-surface ol-film-surface-ceiling-glow" />
    </div>
  );
}
