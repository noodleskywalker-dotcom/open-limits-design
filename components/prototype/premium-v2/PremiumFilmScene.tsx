"use client";

import { motion } from "framer-motion";
import type { PremiumV2Phase } from "@/lib/prototype/premium-v2-constants";

const stroke = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

type PremiumFilmSceneProps = {
  phase: PremiumV2Phase;
  finalRenderUrl?: string | null;
  isMobile: boolean;
};

export default function PremiumFilmScene({ phase, finalRenderUrl, isMobile }: PremiumFilmSceneProps) {
  const drawing = phase !== "pencil";
  const rising = ["rise", "materials", "walkthrough", "exterior"].includes(phase);
  const materials = ["materials", "walkthrough", "exterior"].includes(phase);
  const walking = phase === "walkthrough";
  const exterior = phase === "exterior";
  const collapsing = phase === "collapse";

  const walkScale = walking ? (isMobile ? 1.28 : 1.55) : exterior ? 1.08 : rising ? 1.06 : 1;
  const walkX = walking ? (isMobile ? "-12%" : "-22%") : 0;
  const walkY = walking ? (isMobile ? "-8%" : "-16%") : 0;
  const walkRotateY = walking && !isMobile ? -18 : 0;
  const walkRotateX = walking ? (isMobile ? 6 : 12) : rising ? 10 : 0;

  return (
    <div
      className={`pf2-scene ${rising ? "pf2-scene-rise" : ""} ${materials ? "pf2-scene-materials" : ""} ${walking ? "pf2-scene-walk" : ""} ${exterior ? "pf2-scene-exterior" : ""} ${collapsing ? "pf2-scene-collapse" : ""} ${isMobile ? "pf2-scene-mobile" : ""}`}
    >
      {rising && !walking ? <div aria-hidden className="pf2-rise-pulse" /> : null}

      <motion.div
        animate={{
          scale: walkScale,
          x: walkX,
          y: walkY,
          rotateY: walkRotateY,
          rotateX: walkRotateX
        }}
        className="pf2-camera"
        transition={{ duration: isMobile ? 1.8 : 2.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pf2-stage-sheet">
          {/* 1 — Visible pencil drawing blueprint */}
          <svg aria-hidden className="pf2-svg pf2-svg-draw" viewBox="0 0 800 520">
            <motion.path
              animate={phase === "pencil" ? { pathLength: 1, opacity: 1 } : drawing ? { pathLength: 1, opacity: 0.35 } : { pathLength: 0, opacity: 0 }}
              className="pf2-stroke pf2-stroke-pencil"
              d="M100 380 L100 120 L520 120 L520 380 L100 380 M300 120 V380 M100 250 L520 250 M100 120 L260 120 L260 220 L100 220 Z M320 120 L500 120 L500 220 L320 220 Z"
              initial={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
            {phase === "pencil" ? (
              <motion.g
                animate={{ opacity: [1, 1, 0.6] }}
                className="pf2-pencil-tip"
                transition={{ duration: 1.2, ease: "linear" }}
              >
                <circle className="pf2-pencil-dot" cx="520" cy="250" r="4" />
                <line className="pf2-pencil-body" x1="520" x2="548" y1="250" y2="228" />
              </motion.g>
            ) : null}
          </svg>

          {/* Full blueprint */}
          <svg aria-hidden className="pf2-svg pf2-svg-plan" viewBox="0 0 800 520">
            <g className="pf2-plan-lines">
              <motion.path animate={drawing ? "visible" : "hidden"} className="pf2-stroke pf2-stroke-gold" custom={0} d="M100 120 H520 V380 H100 Z" initial="hidden" variants={stroke} />
              <motion.path animate={drawing ? "visible" : "hidden"} className="pf2-stroke" custom={0.08} d="M300 120 V380" initial="hidden" variants={stroke} />
              <motion.path animate={drawing ? "visible" : "hidden"} className="pf2-stroke" custom={0.14} d="M100 250 H520" initial="hidden" variants={stroke} />
              <motion.path animate={drawing ? "visible" : "hidden"} className="pf2-stroke pf2-room" custom={0.2} d="M100 120 H260 V220 H100 Z" initial="hidden" variants={stroke} />
              <motion.path animate={drawing ? "visible" : "hidden"} className="pf2-stroke pf2-room" custom={0.26} d="M320 120 H500 V220 H320 Z" initial="hidden" variants={stroke} />
              <motion.path animate={drawing ? "visible" : "hidden"} className="pf2-stroke pf2-room" custom={0.32} d="M100 260 H260 V360 H100 Z" initial="hidden" variants={stroke} />
              <motion.path animate={drawing ? "visible" : "hidden"} className="pf2-stroke pf2-elevation" custom={0.38} d="M580 380 L580 150 L700 120 L720 140 L720 380 Z" initial="hidden" variants={stroke} />
            </g>

            {/* 2 — Walls rise directly from blueprint lines */}
            <g className="pf2-extrude-guides">
              <line className="pf2-guide" x1="100" x2="100" y1="220" y2="80" />
              <line className="pf2-guide" x1="260" x2="260" y1="220" y2="80" />
              <line className="pf2-guide" x1="320" x2="320" y1="220" y2="80" />
              <line className="pf2-guide" x1="500" x2="500" y1="220" y2="80" />
              <line className="pf2-guide" x1="100" x2="100" y1="360" y2="260" />
              <line className="pf2-guide" x1="260" x2="260" y1="360" y2="260" />
            </g>
            <g className="pf2-walls-3d">
              <rect className="pf2-wall pf2-wall-a" height="100" width="160" x="100" y="120" />
              <rect className="pf2-wall pf2-wall-b" height="100" width="180" x="320" y="120" />
              <rect className="pf2-wall pf2-wall-c" height="100" width="160" x="100" y="260" />
              <rect className="pf2-wall pf2-wall-d" height="100" width="180" x="320" y="260" />
              <rect className="pf2-roof" height="6" width="420" x="100" y="112" />
            </g>
          </svg>

          {/* 3 — Material reveal */}
          <div className="pf2-materials">
            <div className="pf2-mat pf2-mat-marble">
              <span>Marble</span>
            </div>
            <div className="pf2-mat pf2-mat-wood">
              <span>Wood</span>
            </div>
            <div className="pf2-mat pf2-mat-brass">
              <span>Brass</span>
            </div>
            <div className="pf2-mat pf2-mat-glass">
              <span>Glass</span>
            </div>
          </div>

          {/* 4 — Interior walkthrough world */}
          <div className="pf2-interior">
            <div className="pf2-interior-floor pf2-tex-marble" />
            <div className="pf2-interior-wall pf2-tex-wood" />
            <div className="pf2-interior-brass-rail" />
            <div className="pf2-interior-glass-panel" />
            <div className="pf2-interior-sofa" />
            <div className="pf2-interior-chandelier pf2-tex-brass" />
            <div className="pf2-walk-path" />
          </div>

          {/* 6 — Golden-hour exterior */}
          <div className="pf2-exterior">
            <div className="pf2-golden-sky" />
            <div aria-hidden className="pf2-sun-disc" />
            {finalRenderUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="pf2-villa-photo" loading="eager" src={finalRenderUrl} />
            ) : (
              <div className="pf2-villa-fallback">
                <div className="pf2-villa-body" />
                <div className="pf2-villa-glass-row">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div className="pf2-exterior-glow" />
          </div>

          {/* 7 — Collapse to single line */}
          <svg aria-hidden className="pf2-svg pf2-svg-collapse" viewBox="0 0 800 520">
            <motion.line
              animate={collapsing ? { opacity: 1, pathLength: 1 } : { opacity: 0, pathLength: 0 }}
              className="pf2-collapse-line"
              initial={{ opacity: 0, pathLength: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              x1="80"
              x2="720"
              y1="260"
              y2="260"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
