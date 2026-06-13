"use client";

import type { CSSProperties } from "react";
import type { ClientFilmPhase } from "@/lib/prototype/client-film-constants";
import { clientPhaseAtOrAfter } from "@/lib/prototype/client-film-constants";

type CinematicAtmosphereProps = {
  phase: ClientFilmPhase;
  isMobile: boolean;
};

export default function CinematicAtmosphere({ phase, isMobile }: CinematicAtmosphereProps) {
  const isLogo = phase === "logo" || phase === "enter";
  const showMediaFx = clientPhaseAtOrAfter(phase, "interior") && !isLogo;
  const showLightDust = clientPhaseAtOrAfter(phase, "blueprint") && !isLogo;
  const dustCount = isMobile ? 10 : 24;
  const particleCount = isMobile ? 6 : 14;

  return (
    <>
      <div
        aria-hidden
        className={`olcf-vignette ${showMediaFx ? "olcf-vignette-hero" : ""}`}
      />
      {!isMobile ? <div aria-hidden className="olcf-grain" /> : null}

      {showLightDust ? (
        <div aria-hidden className="olcf-fx">
          {showMediaFx ? (
            <>
              <div className="olcf-haze" />
              <div className="olcf-bloom" />
              <div className="olcf-light-streak" />
              {!isMobile ? <div className="olcf-lens-breathe" /> : null}
            </>
          ) : null}

          {showMediaFx ? (
            <div className="olcf-sun-particles">
              {Array.from({ length: particleCount }, (_, i) => (
                <span className="olcf-sun-particle" key={i} style={{ "--i": i } as CSSProperties} />
              ))}
            </div>
          ) : null}

          <div className="olcf-dust-field">
            {Array.from({ length: dustCount }, (_, i) => (
              <span className="olcf-dust" key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
