"use client";

import { beatProgress, type FilmBeat } from "@/lib/prototype/creation/creation-constants";

type CreationVillaAtmosphereProps = {
  phase: FilmBeat;
  elapsed: number;
  isMobile: boolean;
};

/** Procedural golden-hour atmosphere — no images. */
export default function CreationVillaAtmosphere({
  phase,
  elapsed,
  isMobile
}: CreationVillaAtmosphereProps) {
  const archT = beatProgress(elapsed, "architecture", "identity");

  return (
    <div aria-hidden className="olcrt-layer olcrt-villa-atmo">
      <div className="olcrt-villa-sky" />
      <div className="olcrt-villa-sun" />
      <div className="olcrt-villa-haze" />
      <div className="olcrt-villa-ground-glow" />
      {!isMobile ? <div className="olcrt-villa-rays" /> : null}
      <div className="olcrt-vignette olcrt-vignette-warm" style={{ opacity: 0.3 + archT * 0.35 }} />
    </div>
  );
}
