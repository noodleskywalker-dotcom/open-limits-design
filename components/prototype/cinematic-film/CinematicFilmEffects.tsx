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
  const sunParticleCount = isMobile ? 8 : 18;
  const isExterior = phase === "exterior";
  const isBrand = phase === "brand" || phase === "enter";
  const showBeams = phaseAtOrAfter(phase, "materials") && !isBrand;
  const showLightDust = phaseAtOrAfter(phase, "blueprint") && !isBrand;

  return (
    <>
      <div aria-hidden className={`ol-film-vignette ${isExterior ? "ol-film-vignette-hero" : ""}`} />
      {!isMobile ? <div aria-hidden className="ol-film-grain" /> : null}
      {!isMobile && (isExterior || isBrand) ? (
        <div aria-hidden className="ol-film-lens-breathe-global" />
      ) : null}

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
          {isExterior ? (
            <div className="ol-film-sun-particles">
              {Array.from({ length: sunParticleCount }, (_, i) => (
                <span className="ol-film-sun-particle" key={i} style={{ "--i": i } as CSSProperties} />
              ))}
            </div>
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
