"use client";

import type { CSSProperties } from "react";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type CinematicFilmEffectsProps = {
  phase: CinematicFilmPhase;
  isMobile: boolean;
};

export default function CinematicFilmEffects({ phase, isMobile }: CinematicFilmEffectsProps) {
  const cinematic = phaseAtOrAfter(phase, "walkthrough") && phase !== "brand" && phase !== "enter";
  const dustCount = isMobile ? 10 : 24;

  return (
    <>
      <div aria-hidden className="ol-film-vignette" />
      {!isMobile ? <div aria-hidden className="ol-film-grain" /> : null}
      <div aria-hidden className="ol-film-paper-texture" />

      {cinematic ? (
        <div aria-hidden className="ol-film-fx">
          <div className="ol-film-beam ol-film-beam-a" />
          <div className="ol-film-beam ol-film-beam-b" />
          <div className="ol-film-lens-flare" />
          <div className="ol-film-dust-field">
            {Array.from({ length: dustCount }, (_, i) => (
              <span className="ol-film-dust" key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
