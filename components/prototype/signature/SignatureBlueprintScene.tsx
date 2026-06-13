"use client";

import { motion } from "framer-motion";
import type { SignaturePhase } from "@/lib/prototype/signature-constants";

const stroke = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.6, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const fade = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.7, delay, ease: "easeOut" as const }
  })
};

type SignatureBlueprintSceneProps = {
  phase: SignaturePhase;
};

export default function SignatureBlueprintScene({ phase }: SignatureBlueprintSceneProps) {
  const sketching = phase !== "paper";
  const rising = phase === "rise" || phase === "interior" || phase === "exterior";
  const interior = phase === "interior" || phase === "exterior";
  const exterior = phase === "exterior";
  const collapse = phase === "logo" || phase === "enter";

  return (
    <div
      className={`sig-scene ${rising ? "sig-scene-rising" : ""} ${interior ? "sig-scene-interior" : ""} ${exterior ? "sig-scene-exterior" : ""} ${collapse ? "sig-scene-collapse" : ""}`}
    >
      <motion.div
        animate={{
          scale: interior ? 1.18 : exterior ? 1.05 : rising ? 1.06 : 1,
          x: interior ? "-4%" : 0,
          y: interior ? "-6%" : 0
        }}
        className="sig-camera"
        transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="sig-paper-sheet">
          {/* Phase 1 — single pencil line */}
          {phase === "paper" ? (
            <svg aria-hidden className="sig-svg sig-svg-pencil" viewBox="0 0 800 520">
              <motion.path
                animate={{ pathLength: 1, opacity: 1 }}
                className="sig-stroke sig-stroke-pencil"
                d="M120 380 Q280 340 420 360 T680 320"
                initial={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
          ) : null}

          {/* Blueprint + extrusion from same geometry */}
          <svg aria-hidden className="sig-svg sig-svg-plan" viewBox="0 0 800 520">
            <g className="sig-plan-flat">
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke sig-stroke-primary"
                custom={0}
                d="M80 100 H520 V380 H80 Z"
                initial="hidden"
                variants={stroke}
              />
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke"
                custom={0.1}
                d="M300 100 V380"
                initial="hidden"
                variants={stroke}
              />
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke"
                custom={0.18}
                d="M80 240 H520"
                initial="hidden"
                variants={stroke}
              />
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke sig-room"
                custom={0.26}
                d="M100 120 H260 V220 H100 Z"
                initial="hidden"
                variants={stroke}
              />
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke sig-room"
                custom={0.34}
                d="M320 120 H500 V220 H320 Z"
                initial="hidden"
                variants={stroke}
              />
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke sig-room"
                custom={0.42}
                d="M100 260 H260 V360 H100 Z"
                initial="hidden"
                variants={stroke}
              />
              <motion.text
                animate={sketching ? "visible" : "hidden"}
                className="sig-annotation"
                custom={0.5}
                initial="hidden"
                variants={fade}
                x="118"
                y="175"
              >
                MAJLIS · 8.40 × 6.20
              </motion.text>
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke sig-elevation"
                custom={0.45}
                d="M600 380 L600 140 L720 100 L740 120 L740 380 Z"
                initial="hidden"
                variants={stroke}
              />
              <motion.path
                animate={sketching ? "visible" : "hidden"}
                className="sig-stroke"
                custom={0.55}
                d="M640 200 H700 V260 H640 Z"
                initial="hidden"
                variants={stroke}
              />
              <motion.g animate={sketching ? "visible" : "hidden"} custom={0.62} initial="hidden" variants={fade}>
                <path className="sig-dim-line" d="M80 400 H520" />
                <text className="sig-dim" textAnchor="middle" x="300" y="418">
                  14.400
                </text>
                <circle className="sig-stroke" cx="700" cy="440" r="20" />
                <text className="sig-dim" textAnchor="middle" x="700" y="445">
                  N
                </text>
              </motion.g>
            </g>

            {/* Extruded walls — same footprint, rise from lines */}
            <g className="sig-plan-extrude">
              <rect className="sig-wall sig-wall-a" height="90" width="180" x="100" y="120" />
              <rect className="sig-wall sig-wall-b" height="90" width="180" x="320" y="120" />
              <rect className="sig-wall sig-wall-c" height="100" width="160" x="100" y="260" />
              <rect className="sig-glass" height="60" width="60" x="640" y="200" />
              <rect className="sig-column" height="70" width="12" x="288" y="230" />
              <rect className="sig-column" height="70" width="12" x="410" y="230" />
            </g>
          </svg>

          {/* Interior — forms inside rising structure */}
          <div className="sig-interior-world">
            <div className="sig-marble-floor" />
            <div className="sig-wood-panel" />
            <div className="sig-chandelier" />
            <div className="sig-sofa" />
            <div className="sig-console" />
          </div>

          {/* Exterior hero */}
          <div className="sig-exterior-world">
            <div className="sig-golden-sky" />
            <div className="sig-villa-hero">
              <div className="sig-villa-body" />
              <div className="sig-villa-windows">
                <span />
                <span />
                <span />
              </div>
              <div className="sig-villa-pool" />
            </div>
            <div className="sig-hero-vignette" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
