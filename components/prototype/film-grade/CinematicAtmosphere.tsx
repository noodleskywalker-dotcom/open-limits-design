"use client";

import type { CSSProperties } from "react";
import type { FilmGradePhase } from "@/lib/prototype/film-grade-constants";
import { filmPhaseAtOrAfter } from "@/lib/prototype/film-grade-constants";

type CinematicAtmosphereProps = {
  phase: FilmGradePhase;
  isMobile: boolean;
};

export default function CinematicAtmosphere({ phase, isMobile }: CinematicAtmosphereProps) {
  const isLogo = phase === "logo" || phase === "enter";
  const showMediaFx = filmPhaseAtOrAfter(phase, "interior") && !isLogo;
  const showLightDust = filmPhaseAtOrAfter(phase, "blueprint") && !isLogo;
  const dustCount = isMobile ? 10 : 24;
  const particleCount = isMobile ? 6 : 14;

  return (
    <>
      <div
        aria-hidden
        className={`olfg-vignette ${showMediaFx ? "olfg-vignette-hero" : ""}`}
      />
      {!isMobile ? <div aria-hidden className="olfg-grain" /> : null}

      {showLightDust ? (
        <div aria-hidden className="olfg-fx">
          {showMediaFx ? (
            <>
              <div className="olfg-haze" />
              <div className="olfg-bloom" />
              <div className="olfg-light-streak" />
              {!isMobile ? <div className="olfg-lens-breathe" /> : null}
            </>
          ) : null}

          {showMediaFx ? (
            <div className="olfg-sun-particles">
              {Array.from({ length: particleCount }, (_, i) => (
                <span className="olfg-sun-particle" key={i} style={{ "--i": i } as CSSProperties} />
              ))}
            </div>
          ) : null}

          <div className="olfg-dust-field">
            {Array.from({ length: dustCount }, (_, i) => (
              <span className="olfg-dust" key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
