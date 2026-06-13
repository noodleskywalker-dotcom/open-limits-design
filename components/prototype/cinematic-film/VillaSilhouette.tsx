"use client";

import { motion } from "framer-motion";

/** Shared luxury villa silhouette — exterior hero + brand morph source. */
export const VILLA_MORPH_LINES = [
  { x1: 280, y1: 480, x2: 600, y2: 340, delay: 0 },
  { x1: 920, y1: 480, x2: 600, y2: 340, delay: 0.05 },
  { x1: 280, y1: 220, x2: 600, y2: 340, delay: 0.1 },
  { x1: 920, y1: 220, x2: 600, y2: 340, delay: 0.15 },
  { x1: 380, y1: 480, x2: 380, y2: 260, delay: 0.08 },
  { x1: 820, y1: 480, x2: 820, y2: 260, delay: 0.12 },
  { x1: 320, y1: 260, x2: 880, y2: 260, delay: 0.18 },
  { x1: 300, y1: 220, x2: 900, y2: 200, delay: 0.22 }
] as const;

type VillaSilhouetteProps = {
  mode: "hero" | "morph";
  glowing?: boolean;
  collapsing?: boolean;
  morphDelay?: number;
};

export function VillaSilhouetteSvg({
  mode,
  glowing = false,
  collapsing = false,
  morphDelay = 0
}: VillaSilhouetteProps) {
  return (
    <svg aria-hidden className="ol-film-svg ol-film-villa-svg" viewBox="0 0 1200 675">
      {mode === "morph" ? (
        <g className={`ol-film-villa-morph-lines ${glowing ? "ol-film-villa-glow" : ""}`}>
          {VILLA_MORPH_LINES.map((line, i) => (
            <motion.line
              animate={
                collapsing
                  ? { x2: 600, y2: 340, opacity: [0.95, 0], pathLength: [1, 0.05] }
                  : { opacity: glowing ? 0.95 : 0.75, pathLength: 1 }
              }
              className="ol-film-villa-edge-line"
              initial={{ opacity: 0, pathLength: 0 }}
              key={i}
              transition={{
                duration: collapsing ? 1.15 : 0.9,
                delay: collapsing ? morphDelay + line.delay : line.delay,
                ease: [0.16, 1, 0.3, 1]
              }}
              x1={line.x1}
              x2={line.x2}
              y1={line.y1}
              y2={line.y2}
            />
          ))}
        </g>
      ) : null}
      <g className="ol-film-villa-outline">
        <path
          className="ol-film-villa-roof-path"
          d="M260 280 L600 180 L940 280 L920 480 L280 480 Z"
        />
        <rect className="ol-film-villa-glass" height="140" width="55" x="420" y="300" />
        <rect className="ol-film-villa-glass" height="140" width="55" x="500" y="300" />
        <rect className="ol-film-villa-glass" height="140" width="55" x="580" y="300" />
        <rect className="ol-film-villa-glass" height="140" width="55" x="660" y="300" />
        <rect className="ol-film-villa-glass" height="140" width="55" x="740" y="300" />
        <rect className="ol-film-villa-column" height="200" width="14" x="390" y="280" />
        <rect className="ol-film-villa-column" height="200" width="14" x="796" y="280" />
      </g>
    </svg>
  );
}

/** Full luxury villa hero — golden hour, pool, atmosphere. */
export default function VillaSilhouette({ mode, glowing, collapsing, morphDelay }: VillaSilhouetteProps) {
  return (
    <div className={`ol-film-villa-hero ${mode === "morph" ? "ol-film-villa-hero-morph" : ""}`}>
      <div className="ol-film-villa-sky" />
      <div className="ol-film-villa-sun" />
      <div className="ol-film-villa-sun-rays" />
      <div className="ol-film-villa-haze" />
      <div className="ol-film-villa-ground-shadow" />
      <div className="ol-film-villa-body">
        <VillaSilhouetteSvg
          collapsing={collapsing}
          glowing={glowing}
          mode={mode}
          morphDelay={morphDelay}
        />
        <div className="ol-film-villa-interior-glow" />
        <div className="ol-film-villa-glass-shine" />
      </div>
      <div className="ol-film-villa-pool">
        <div className="ol-film-villa-pool-reflect" />
        <div className="ol-film-villa-pool-shimmer" />
      </div>
      <div className="ol-film-villa-palm ol-film-villa-palm-l" />
      <div className="ol-film-villa-palm ol-film-villa-palm-r" />
      <div className="ol-film-villa-landscape" />
      <div className="ol-film-villa-flare" />
      <div className="ol-film-villa-vignette" />
    </div>
  );
}
