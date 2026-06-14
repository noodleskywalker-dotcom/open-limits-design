"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { IntroPhase } from "@/lib/intro/constants";

type VillaBlueprintSvgProps = {
  phase: IntroPhase;
};

const stroke = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const fade = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.8, delay, ease: "easeOut" as const }
  })
};

export default function VillaBlueprintSvg({ phase }: VillaBlueprintSvgProps) {
  const reduced = useReducedMotion();
  const drawing =
    phase === "draw" ||
    phase === "structure" ||
    phase === "interior" ||
    phase === "masterpiece" ||
    phase === "brand" ||
    phase === "enter";
  const collapse = phase === "brand" || phase === "enter";

  if (reduced) return null;

  return (
    <svg
      aria-hidden
      className={`ols-blueprint-svg ${collapse ? "ols-blueprint-svg-collapse" : ""}`}
      viewBox="0 0 800 520"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern height="24" id="ols-grid" patternUnits="userSpaceOnUse" width="24">
          <path d="M24 0H0V24" fill="none" stroke="rgba(200,162,74,0.06)" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="ols-paper-shine" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <rect fill="url(#ols-grid)" height="520" width="800" />
      <rect fill="url(#ols-paper-shine)" height="520" width="800" />

      {/* Title block */}
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-annotation"
        custom={0.1}
        initial="hidden"
        variants={fade}
        x="48"
        y="42"
      >
        OPEN LIMITS RESIDENCE — LUSAIL
      </motion.text>
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-dim"
        custom={0.25}
        initial="hidden"
        variants={fade}
        x="48"
        y="62"
      >
        SCALE 1:100 · SHEET A-01 · FLOOR PLAN + ELEVATION
      </motion.text>

      {/* Outer shell — floor plan */}
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-primary"
        custom={0}
        d="M80 100 H520 V380 H80 Z"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke"
        custom={0.12}
        d="M300 100 V380"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke"
        custom={0.2}
        d="M80 240 H520"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke"
        custom={0.28}
        d="M180 100 V240"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke"
        custom={0.34}
        d="M420 240 V380"
        initial="hidden"
        variants={stroke}
      />

      {/* Majlis + living */}
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-room"
        custom={0.42}
        d="M100 120 H260 V220 H100 Z"
        initial="hidden"
        variants={stroke}
      />
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-label"
        custom={0.55}
        initial="hidden"
        variants={fade}
        x="118"
        y="175"
      >
        MAJLIS
      </motion.text>
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-dim"
        custom={0.58}
        initial="hidden"
        variants={fade}
        x="118"
        y="192"
      >
        8.40 × 6.20 m
      </motion.text>

      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-room"
        custom={0.48}
        d="M320 120 H500 V220 H320 Z"
        initial="hidden"
        variants={stroke}
      />
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-label"
        custom={0.6}
        initial="hidden"
        variants={fade}
        x="355"
        y="175"
      >
        LIVING
      </motion.text>

      {/* Dining + kitchen wing */}
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-room"
        custom={0.55}
        d="M100 260 H260 V360 H100 Z"
        initial="hidden"
        variants={stroke}
      />
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-label"
        custom={0.65}
        initial="hidden"
        variants={fade}
        x="145"
        y="315"
      >
        DINING
      </motion.text>

      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-room"
        custom={0.62}
        d="M440 260 H500 V360 H440 Z"
        initial="hidden"
        variants={stroke}
      />
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-label"
        custom={0.7}
        initial="hidden"
        variants={fade}
        x="448"
        y="315"
      >
        BED 01
      </motion.text>

      {/* Columns */}
      {[
        [120, 240],
        [260, 240],
        [340, 240],
        [480, 240]
      ].map(([cx, cy], index) => (
        <motion.circle
          animate={drawing ? "visible" : "hidden"}
          className="ols-bp-stroke ols-bp-column"
          custom={0.72 + index * 0.05}
          cx={cx}
          cy={cy}
          initial="hidden"
          key={`col-${cx}`}
          r="6"
          variants={fade}
        />
      ))}

      {/* Door swings */}
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-detail"
        custom={0.85}
        d="M300 320 A 28 28 0 0 1 328 348"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-detail"
        custom={0.9}
        d="M520 260 H560 V380 H520 Z"
        initial="hidden"
        variants={stroke}
      />

      {/* Dimension lines */}
      <motion.g animate={drawing ? "visible" : "hidden"} custom={0.95} initial="hidden" variants={fade}>
        <path className="ols-bp-dim-line" d="M80 400 H520" />
        <path className="ols-bp-dim-line" d="M80 395 V405 M520 395 V405" />
        <text className="ols-bp-dim" textAnchor="middle" x="300" y="418">
          14.400
        </text>
        <path className="ols-bp-dim-line" d="M540 100 V380" />
        <text className="ols-bp-dim" x="552" y="245">
          8.400
        </text>
      </motion.g>

      {/* Elevation — right */}
      <motion.text
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-annotation"
        custom={0.35}
        initial="hidden"
        variants={fade}
        x="590"
        y="42"
      >
        ELEVATION — SOUTH
      </motion.text>
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-elevation"
        custom={0.4}
        d="M600 380 L600 140 L720 100 L740 120 L740 380 Z"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke"
        custom={0.52}
        d="M640 200 H700 V260 H640 Z"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke"
        custom={0.58}
        d="M660 120 V200 M680 120 V200"
        initial="hidden"
        variants={stroke}
      />
      <motion.path
        animate={drawing ? "visible" : "hidden"}
        className="ols-bp-stroke ols-bp-roof"
        custom={0.65}
        d="M580 140 L670 115 L760 140"
        initial="hidden"
        variants={stroke}
      />

      {/* North arrow */}
      <motion.g animate={drawing ? "visible" : "hidden"} custom={1.05} initial="hidden" variants={fade}>
        <circle className="ols-bp-stroke" cx="700" cy="440" r="22" />
        <path className="ols-bp-stroke" d="M700 425 L700 455 M688 437 L700 425 L712 437" />
        <text className="ols-bp-dim" textAnchor="middle" x="700" y="478">
          N
        </text>
      </motion.g>
    </svg>
  );
}
