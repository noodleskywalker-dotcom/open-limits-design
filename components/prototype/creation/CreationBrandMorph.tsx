"use client";

import { motion } from "framer-motion";
import type { CreationPhase } from "@/lib/prototype/creation/creation-constants";
import { phaseProgress } from "@/lib/prototype/creation/creation-constants";
import { LOGO_PATHS, VILLA_MORPH_LINES } from "@/lib/prototype/creation/villa-geometry";

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
  const collapse = phase === "brand" ? brandT : 1;
  const centerX = 600;
  const centerY = 340;

  return (
    <div aria-hidden className="olcrt-layer olcrt-brand-layer">
      <div className="olcrt-brand-bloom" />

      <svg className="olcrt-svg olcrt-svg-morph" viewBox="0 0 1200 675">
        <g className="olcrt-villa-morph-lines">
          {VILLA_MORPH_LINES.map((line, i) => {
            const x1 = lerp(line.x1, centerX, collapse * 0.88);
            const y1 = lerp(line.y1, centerY, collapse * 0.88);
            const x2 = lerp(line.x2, centerX + (i % 2 === 0 ? -40 : 40), collapse);
            const y2 = lerp(line.y2, centerY, collapse);
            return (
              <line
                className="olcrt-villa-edge-line"
                key={i}
                opacity={Math.max(0, 1 - collapse * 0.92)}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
            );
          })}
        </g>

        <line
          className="olcrt-logo-gold-line"
          opacity={brandT > 0.35 ? 1 : 0}
          x1={lerp(centerX, LOGO_PATHS.goldLine.x1, Math.max(0, (brandT - 0.35) / 0.65))}
          x2={lerp(centerX, LOGO_PATHS.goldLine.x2, Math.max(0, (brandT - 0.35) / 0.65))}
          y1={centerY}
          y2={centerY}
        />

        {brandT > 0.5 ? (
          <>
            <motion.path
              animate={{ pathLength: Math.min(1, (brandT - 0.5) * 2), opacity: 1 }}
              className="olcrt-logo-frame"
              d={LOGO_PATHS.frame}
              initial={{ pathLength: 0, opacity: 0 }}
            />
            <motion.path
              animate={{ pathLength: Math.min(1, (brandT - 0.58) * 2.4), opacity: 1 }}
              className="olcrt-logo-frame"
              d={LOGO_PATHS.frameLeg}
              initial={{ pathLength: 0, opacity: 0 }}
            />
            <motion.path
              animate={{ pathLength: Math.min(1, (brandT - 0.65) * 2.8), opacity: 1 }}
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
