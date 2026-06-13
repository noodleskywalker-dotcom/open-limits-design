"use client";

import type { CSSProperties } from "react";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

type CinematicFilmEffectsProps = {
  phase: CinematicFilmPhase;
  isMobile: boolean;
};

export default function CinematicFilmEffects({ phase, isMobile }: CinematicFilmEffectsProps) {
  const dustCount = isMobile ? 14 : 32;
  const showBeams = phaseAtOrAfter(phase, "materials") && phase !== "brand" && phase !== "enter";
  const showLightDust = phaseAtOrAfter(phase, "blueprint");

  return (
    <>
      <div aria-hidden className="ol-film-vignette" />
      {!isMobile ? <div aria-hidden className="ol-film-grain" /> : null}

      {showLightDust ? (
        <div aria-hidden className="ol-film-fx ol-film-fx-global">
          {showBeams ? (
            <>
              <div className="ol-film-beam ol-film-beam-a" />
              <div className="ol-film-beam ol-film-beam-b" />
              <div className="ol-film-beam ol-film-beam-c" />
              <div className="ol-film-lens-flare" />
            </>
          ) : null}
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
