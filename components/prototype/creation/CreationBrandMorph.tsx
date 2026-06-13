"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { CreationPhase } from "@/lib/prototype/creation/creation-constants";
import { phaseProgress } from "@/lib/prototype/creation/creation-constants";
import {
  brandCollapseT,
  LOGO_ANCHOR,
  LOGO_PATHS,
  morphLineState,
  VILLA_MORPH_LINES
} from "@/lib/prototype/creation/villa-geometry";

type CreationBrandMorphProps = {
  phase: CreationPhase;
  elapsed: number;
  companyName?: string;
  tagline?: string;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function CreationBrandMorph({
  phase,
  elapsed,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits"
}: CreationBrandMorphProps) {
  const show = phase === "brand" || phase === "enter";
  if (!show) return null;

  const brandT = phaseProgress(elapsed, "brand", "enter");
  const collapse = brandCollapseT(brandT);
  const logoDrawT = Math.max(0, (collapse - 0.48) / 0.52);
  const bloomIntensity = 0.14 + collapse * 0.22;

  return (
    <div
      aria-hidden
      className="olcrt-layer olcrt-brand-layer"
      style={{ "--olcrt-bloom": bloomIntensity } as CSSProperties}
    >
      <div className="olcrt-brand-bloom" />

      <svg className="olcrt-svg olcrt-svg-morph" viewBox="0 0 1200 675">
        <g className="olcrt-villa-morph-lines">
          {VILLA_MORPH_LINES.map((line, i) => {
            const state = morphLineState(line, collapse);
            return (
              <line
                className="olcrt-villa-edge-line"
                key={i}
                opacity={state.opacity}
                strokeWidth={state.width}
                x1={state.x1}
                x2={state.x2}
                y1={state.y1}
                y2={state.y2}
              />
            );
          })}
        </g>

        <line
          className="olcrt-logo-gold-line"
          opacity={logoDrawT > 0.05 ? Math.min(1, logoDrawT * 1.4) : collapse * 0.35}
          strokeWidth={2 + logoDrawT}
          x1={lerp(LOGO_ANCHOR.x, LOGO_PATHS.goldLine.x1, logoDrawT)}
          x2={lerp(LOGO_ANCHOR.x, LOGO_PATHS.goldLine.x2, logoDrawT)}
          y1={LOGO_ANCHOR.y}
          y2={LOGO_ANCHOR.y}
        />

        {logoDrawT > 0.12 ? (
          <>
            <motion.path
              animate={{ pathLength: Math.min(1, logoDrawT * 1.35), opacity: 1 }}
              className="olcrt-logo-frame"
              d={LOGO_PATHS.frame}
              initial={{ pathLength: 0, opacity: 0 }}
            />
            <motion.path
              animate={{ pathLength: Math.min(1, Math.max(0, (logoDrawT - 0.1) * 1.5)), opacity: 1 }}
              className="olcrt-logo-frame"
              d={LOGO_PATHS.frameLeg}
              initial={{ pathLength: 0, opacity: 0 }}
            />
            <motion.path
              animate={{ pathLength: Math.min(1, Math.max(0, (logoDrawT - 0.18) * 1.65)), opacity: 1 }}
              className="olcrt-logo-accent"
              d={LOGO_PATHS.accent}
              initial={{ pathLength: 0, opacity: 0 }}
            />
          </>
        ) : null}
      </svg>

      {phase === "enter" ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="olcrt-logo-lockup"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="olcrt-logo-name">{companyName.toUpperCase()}</h1>
          <p className="olcrt-logo-tag">{tagline}</p>
        </motion.div>
      ) : null}
    </div>
  );
}
