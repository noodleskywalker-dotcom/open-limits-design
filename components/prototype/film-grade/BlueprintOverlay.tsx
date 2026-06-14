"use client";

import { motion } from "framer-motion";
import type { FilmGradePhase } from "@/lib/prototype/film-grade-constants";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] as const }
  })
};

type BlueprintOverlayProps = {
  phase: FilmGradePhase;
};

export default function BlueprintOverlay({ phase }: BlueprintOverlayProps) {
  const show = phase === "idea" || phase === "blueprint" || phase === "structure";
  const drawing = phase === "blueprint";
  const fadeOut = phase === "structure";

  if (!show) return null;

  return (
    <motion.div
      animate={{ opacity: fadeOut ? 0.35 : 1 }}
      aria-hidden
      className="olfg-layer olfg-blueprint"
      initial={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="olfg-vellum" />
      <div className="olfg-vellum-frame" />

      {phase === "idea" ? (
        <>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="olfg-gold-point"
            initial={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
          <svg className="olfg-svg olfg-svg-idea" viewBox="0 0 1200 675">
            <motion.path
              animate={{ pathLength: 1, opacity: 1 }}
              className="olfg-stroke olfg-stroke-gold"
              d="M600 420 L600 300 L760 296"
              initial={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </>
      ) : null}

      {drawing || fadeOut ? (
        <svg className="olfg-svg olfg-svg-plan" viewBox="0 0 1200 675">
          <g className="olfg-grid" opacity={drawing ? 0.45 : 0.15}>
            {Array.from({ length: 11 }, (_, i) => (
              <line
                className="olfg-grid-line"
                key={`gv-${i}`}
                x1={100 + i * 90}
                x2={100 + i * 90}
                y1={70}
                y2={600}
              />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <line
                className="olfg-grid-line"
                key={`gh-${i}`}
                x1={100}
                x2={1000}
                y1={70 + i * 90}
                y2={70 + i * 90}
              />
            ))}
          </g>

          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke olfg-stroke-gold"
            custom={0}
            d="M190 420 Q192 290 196 175 H610 Q612 290 610 420 H190 Z"
            initial="hidden"
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke"
            custom={0.1}
            d="M390 175 Q392 290 394 420"
            initial="hidden"
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke"
            custom={0.14}
            d="M196 295 Q400 298 610 295"
            initial="hidden"
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke olfg-stroke-room"
            custom={0.18}
            d="M196 175 H390 Q394 235 390 295 H196 Z"
            initial="hidden"
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke olfg-stroke-room"
            custom={0.22}
            d="M394 175 H610 Q614 235 610 295 H394 Z"
            initial="hidden"
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke olfg-stroke-pool"
            custom={0.28}
            d="M658 340 H810 Q814 405 810 470 H658 Z"
            initial="hidden"
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke olfg-stroke-gold"
            custom={0.34}
            d="M870 470 L874 228 Q952 195 1034 188 L1098 208 L1100 470 Z"
            initial="hidden"
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke olfg-stroke-dim"
            custom={0.42}
            d="M196 538 H610 M196 546 V530 M610 546 V530"
            initial="hidden"
            variants={draw}
          />
          <text className="olfg-annotation olfg-annotation-title" x={210} y={130}>
            VILLA TYPE A — GROUND FLOOR
          </text>
          <text className="olfg-annotation" x={230} y={250}>
            LIVING
          </text>
          <text className="olfg-annotation" x={450} y={250}>
            MASTER SUITE
          </text>
          <text className="olfg-annotation" x={690} y={410}>
            POOL
          </text>
          <text className="olfg-annotation" x={930} y={165}>
            ELEVATION A
          </text>
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olfg-stroke olfg-stroke-gold"
            custom={0.48}
            d="M1030 548 L1030 515 M1012 532 L1030 515 L1048 532"
            initial="hidden"
            variants={draw}
          />
          <text className="olfg-annotation olfg-annotation-n" x={1022} y={568}>
            N
          </text>
        </svg>
      ) : null}
    </motion.div>
  );
}
