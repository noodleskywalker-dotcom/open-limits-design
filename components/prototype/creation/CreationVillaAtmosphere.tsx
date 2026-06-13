"use client";

import type { CreationPhase } from "@/lib/prototype/creation/creation-constants";
import { phaseProgress } from "@/lib/prototype/creation/creation-constants";

type CreationVillaAtmosphereProps = {
  phase: CreationPhase;
  elapsed: number;
  isMobile: boolean;
};

/** Procedural golden-hour atmosphere — no images. */
export default function CreationVillaAtmosphere({
  phase,
  elapsed,
  isMobile
}: CreationVillaAtmosphereProps) {
  const villaT = phaseProgress(elapsed, "villa", "brand");

  return (
    <div aria-hidden className="olcrt-layer olcrt-villa-atmo">
      <div className="olcrt-villa-sky" />
      <div className="olcrt-villa-sun" />
      <div className="olcrt-villa-haze" />
      <div className="olcrt-villa-ground-glow" />
      {!isMobile ? <div className="olcrt-villa-rays" /> : null}
      <div className="olcrt-vignette olcrt-vignette-warm" style={{ opacity: 0.35 + villaT * 0.25 }} />
    </div>
  );
}
