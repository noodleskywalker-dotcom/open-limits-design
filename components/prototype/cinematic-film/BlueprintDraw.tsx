"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.6, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

type BlueprintDrawProps = {
  phase: CinematicFilmPhase;
};

export default function BlueprintDraw({ phase }: BlueprintDrawProps) {
  const idea = phase === "idea";
  const blueprint = phase === "blueprint";
  const showPlan = phaseAtOrAfter(phase, "blueprint");
  const fadePlan = phaseAtOrAfter(phase, "structure");

  return (
    <div
      aria-hidden
      className={`ol-film-layer ol-film-blueprint ${fadePlan ? "ol-film-blueprint-fade" : ""}`}
    >
      {idea ? (
        <>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="ol-film-gold-point"
            initial={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <svg className="ol-film-svg ol-film-svg-idea" viewBox="0 0 1200 675">
            <motion.path
              animate={{ pathLength: 1, opacity: 1 }}
              className="ol-film-stroke ol-film-stroke-idea"
              d="M600 420 L600 280 L780 280"
              initial={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        </>
      ) : null}

      {showPlan ? (
        <svg className="ol-film-svg ol-film-svg-plan" viewBox="0 0 1200 675">
          {/* Grid */}
          <g className="ol-film-grid" opacity={blueprint ? 1 : 0.35}>
            {Array.from({ length: 13 }, (_, i) => (
              <line
                key={`gv-${i}`}
                className="ol-film-grid-line"
                x1={80 + i * 80}
                x2={80 + i * 80}
                y1={60}
                y2={615}
              />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <line
                key={`gh-${i}`}
                className="ol-film-grid-line"
                x1={80}
                x2={1120}
                y1={60 + i * 80}
                y2={60 + i * 80}
              />
            ))}
          </g>

          {/* Floor plan — villa layout */}
          <g className="ol-film-plan-main">
            <motion.path
              animate={showPlan ? "visible" : "hidden"}
              className="ol-film-stroke ol-film-stroke-gold"
              custom={0}
              d="M180 420 H620 V180 H180 Z"
              initial="hidden"
              variants={draw}
            />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.06} d="M380 180 V420" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.1} d="M180 300 H620" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.14} d="M180 180 H380 V300 H180 Z" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.18} d="M380 180 H620 V300 H380 Z" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.22} d="M180 300 H380 V420 H180 Z" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.26} d="M380 300 H620 V420 H380 Z" initial="hidden" variants={draw} />
            {/* Pool */}
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-pool" custom={0.3} d="M660 340 H820 V480 H660 Z" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-pool" custom={0.34} d="M660 340 Q740 320 820 340" initial="hidden" variants={draw} />
          </g>

          {/* Elevation */}
          <g className="ol-film-plan-elevation">
            <motion.path
              animate={showPlan ? "visible" : "hidden"}
              className="ol-film-stroke ol-film-stroke-gold"
              custom={0.38}
              d="M880 480 L880 220 L1040 180 L1120 200 L1120 480 Z"
              initial="hidden"
              variants={draw}
            />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.44} d="M920 480 V320 H1080 V480" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.48} d="M960 480 V360 H1040 V480" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.52} d="M880 220 L1040 180" initial="hidden" variants={draw} />
          </g>

          {/* Section lines */}
          <g className="ol-film-section">
            <motion.line animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-section" custom={0.56} initial="hidden" variants={draw} x1={140} x2={140} y1={140} y2={520} />
            <motion.line animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-section" custom={0.58} initial="hidden" variants={draw} x1={640} x2={640} y1={140} y2={520} />
          </g>

          {/* Dimension marks */}
          <g className="ol-film-dims">
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-dim" custom={0.6} d="M180 540 H620 M180 548 V532 M620 548 V532" initial="hidden" variants={draw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-dim" custom={0.64} d="M140 180 V420 M132 180 H148 M132 420 H148" initial="hidden" variants={draw} />
            <text className="ol-film-annotation" x={360} y={565}>
              14.2m
            </text>
            <text className="ol-film-annotation" x={110} y={310}>
              8.4m
            </text>
          </g>

          {/* Annotations */}
          <text className="ol-film-annotation ol-film-annotation-title" x={200} y={130}>
            VILLA TYPE A — GROUND FLOOR
          </text>
          <text className="ol-film-annotation" x={220} y={250}>
            LIVING
          </text>
          <text className="ol-film-annotation" x={440} y={250}>
            MASTER SUITE
          </text>
          <text className="ol-film-annotation" x={690} y={420}>
            POOL
          </text>
          <text className="ol-film-annotation" x={920} y={160}>
            ELEVATION A
          </text>

          {/* North arrow */}
          <g className="ol-film-north">
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-gold" custom={0.68} d="M1050 560 L1050 520 M1030 540 L1050 520 L1070 540" initial="hidden" variants={draw} />
            <text className="ol-film-annotation ol-film-annotation-n" x={1042} y={580}>
              N
            </text>
          </g>
        </svg>
      ) : null}
    </div>
  );
}
