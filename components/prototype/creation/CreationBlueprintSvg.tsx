"use client";

import { motion } from "framer-motion";
import type { CreationPhase } from "@/lib/prototype/creation/creation-constants";
import { creationPhaseAtOrAfter, phaseProgress } from "@/lib/prototype/creation/creation-constants";
import {
  BLUEPRINT_STROKES,
  strokeColor,
  strokeVisualState,
  wallProgressMap,
  type BlueprintStrokeVariant
} from "@/lib/prototype/creation/villa-geometry";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] as const }
  })
};

type CreationBlueprintSvgProps = {
  phase: CreationPhase;
  elapsed: number;
};

function strokeClass(variant: BlueprintStrokeVariant) {
  switch (variant) {
    case "gold":
      return "olcrt-stroke olcrt-stroke-gold";
    case "room":
      return "olcrt-stroke olcrt-stroke-room";
    case "pool":
      return "olcrt-stroke olcrt-stroke-pool";
    case "dim":
      return "olcrt-stroke olcrt-stroke-dim";
    default:
      return "olcrt-stroke";
  }
}

export default function CreationBlueprintSvg({ phase, elapsed }: CreationBlueprintSvgProps) {
  const showPencil = phase === "pencil";
  const showPlan = creationPhaseAtOrAfter(phase, "blueprint") && phase !== "brand" && phase !== "enter";
  const drawing = phase === "blueprint";
  const transformT = phaseProgress(elapsed, "transform", "villa");
  const progressMap = wallProgressMap(transformT);
  const syncPhase = phase === "transform" || phase === "villa" ? phase : "blueprint";

  if (!showPencil && !showPlan) return null;

  const annotationOpacity =
    phase === "transform"
      ? Math.max(0, 1 - transformT * 1.4)
      : phase === "villa"
        ? 0.12
        : 1;

  return (
    <div aria-hidden className="olcrt-layer olcrt-blueprint-layer">
      {showPencil ? (
        <>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="olcrt-gold-point"
            initial={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          <svg className="olcrt-svg olcrt-svg-pencil" viewBox="0 0 1200 675">
            <motion.path
              animate={{ pathLength: 1, opacity: 1 }}
              className="olcrt-stroke olcrt-stroke-gold olcrt-stroke-pencil"
              d="M600 422 Q601 352 600 284 L778 279"
              initial={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 2.2, ease: [0.12, 1, 0.28, 1] }}
            />
            <motion.circle
              animate={{ cx: [600, 600, 778], cy: [422, 284, 279], opacity: [1, 1, 0.6] }}
              className="olcrt-pencil-tip"
              initial={{ opacity: 0 }}
              r="4"
              transition={{ duration: 2.2, ease: "linear" }}
            />
          </svg>
        </>
      ) : null}

      {showPlan ? (
        <svg className="olcrt-svg olcrt-svg-plan" viewBox="0 0 1200 675">
          <g className="olcrt-grid" opacity={drawing ? 0.5 : phase === "transform" ? 0.1 : 0.2}>
            {Array.from({ length: 13 }, (_, i) => (
              <line
                className="olcrt-grid-line"
                key={`gv-${i}`}
                x1={80 + i * 80}
                x2={80 + i * 80}
                y1={60}
                y2={615}
              />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <line
                className="olcrt-grid-line"
                key={`gh-${i}`}
                x1={80}
                x2={1120}
                y1={60 + i * 80}
                y2={60 + i * 80}
              />
            ))}
          </g>

          {BLUEPRINT_STROKES.map((stroke) => {
            const visual = strokeVisualState(stroke, progressMap, syncPhase);
            if (!drawing && visual.opacity < 0.02) return null;

            return (
              <g key={stroke.id} transform={`translate(0 ${-visual.liftY})`}>
                <motion.path
                  animate={drawing ? "visible" : "hidden"}
                  className={strokeClass(stroke.variant)}
                  custom={stroke.drawDelay}
                  d={stroke.d}
                  initial="hidden"
                  opacity={drawing ? undefined : visual.opacity}
                  stroke={strokeColor(visual.warmth, stroke.variant)}
                  variants={draw}
                />
              </g>
            );
          })}

          <g opacity={annotationOpacity}>
            <text className="olcrt-annotation olcrt-annotation-title" x={198} y={128}>
              VILLA TYPE A — GROUND FLOOR
            </text>
            <text className="olcrt-annotation" x={218} y={248}>
              LIVING · 14.2m
            </text>
            <text className="olcrt-annotation" x={438} y={248}>
              MASTER SUITE
            </text>
            <text className="olcrt-annotation" x={688} y={418}>
              POOL
            </text>
            <text className="olcrt-annotation" x={918} y={158}>
              ELEVATION A
            </text>
            <text className="olcrt-annotation olcrt-annotation-scale" x={100} y={568}>
              SCALE 1:100 · SHEET A-01
            </text>
            <text className="olcrt-annotation olcrt-annotation-n" x={1040} y={578}>
              N
            </text>
          </g>
        </svg>
      ) : null}
    </div>
  );
}
