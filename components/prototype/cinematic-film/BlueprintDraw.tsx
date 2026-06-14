"use client";

import { motion } from "framer-motion";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";
import { phaseAtOrAfter } from "@/lib/prototype/cinematic-film-constants";

/** Faster blueprint draw — 2s phase window, building gets more screen time. */
const pencilDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.35, delay, ease: [0.16, 1, 0.3, 1] as const }
  })
};

const pressureDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 0.35,
    transition: { duration: 1.5, delay: delay + 0.05, ease: [0.12, 1, 0.28, 1] as const }
  })
};

type BlueprintDrawProps = {
  phase: CinematicFilmPhase;
};

function SketchFilters() {
  return (
    <defs>
      <filter id="ol-film-pencil-rough" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence baseFrequency="0.04" numOctaves="2" result="noise" seed="8" type="fractalNoise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="ol-film-pencil-soft" x="-4%" y="-4%" width="108%" height="108%">
        <feGaussianBlur result="blur" stdDeviation="0.35" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export default function BlueprintDraw({ phase }: BlueprintDrawProps) {
  const idea = phase === "idea";
  const blueprint = phase === "blueprint";
  const showPlan = phaseAtOrAfter(phase, "blueprint");
  const fadePlan = phaseAtOrAfter(phase, "structure");

  return (
    <div
      aria-hidden
      className={`ol-film-layer ol-film-blueprint ${fadePlan ? "ol-film-blueprint-fading" : ""}`}
    >
      <div className="ol-film-vellum" />
      <div className="ol-film-vellum-edge" />

      {idea ? (
        <>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="ol-film-gold-point"
            initial={{ opacity: 0, scale: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          <svg className="ol-film-svg ol-film-svg-idea" viewBox="0 0 1200 675">
            <SketchFilters />
            <motion.path
              animate={{ pathLength: 1, opacity: 1 }}
              className="ol-film-stroke ol-film-stroke-idea ol-film-stroke-pressure"
              d="M600 422 Q601 352 600 284 L778 279"
              filter="url(#ol-film-pencil-soft)"
              initial={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.path
              animate={{ pathLength: 1, opacity: 0.4 }}
              className="ol-film-stroke ol-film-stroke-idea ol-film-stroke-ghost"
              d="M600 422 Q601 352 600 284 L778 279"
              initial={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.06, ease: [0.12, 1, 0.28, 1] }}
            />
            <motion.circle
              animate={{ cx: [600, 600, 778], cy: [422, 284, 279], opacity: [1, 1, 0.5] }}
              className="ol-film-pencil-tip"
              initial={{ opacity: 0 }}
              r="3"
              transition={{ duration: 1.4, ease: "linear" }}
            />
          </svg>
        </>
      ) : null}

      {showPlan ? (
        <svg className="ol-film-svg ol-film-svg-plan" viewBox="0 0 1200 675">
          <SketchFilters />

          <g className="ol-film-grid" opacity={blueprint ? 0.55 : 0.2}>
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

          {/* Hand-drawn plan — slight imperfections in paths */}
          <g className="ol-film-plan-main" filter="url(#ol-film-pencil-rough)">
            <motion.path
              animate={showPlan ? "visible" : "hidden"}
              className="ol-film-stroke ol-film-stroke-gold"
              custom={0}
              d="M178 418 Q179 300 182 182 H618 Q620 300 618 418 H178 Z"
              initial="hidden"
              variants={pencilDraw}
            />
            <motion.path
              animate={showPlan ? "visible" : "hidden"}
              className="ol-film-stroke ol-film-stroke-ghost"
              custom={0}
              d="M178 418 Q179 300 182 182 H618 Q620 300 618 418 H178 Z"
              initial="hidden"
              variants={pressureDraw}
            />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.08} d="M378 182 Q380 300 382 418" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.12} d="M182 298 Q400 302 618 300" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.16} d="M182 182 H378 Q382 240 378 298 H182 Z" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.2} d="M382 182 H618 Q622 240 618 298 H382 Z" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.24} d="M182 302 H378 V416 H182 Z" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-room" custom={0.28} d="M382 302 H618 V416 H382 Z" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-pool" custom={0.32} d="M662 342 H818 Q822 410 818 478 H662 Z" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-pool" custom={0.36} d="M662 342 Q742 318 818 342" initial="hidden" variants={pencilDraw} />
          </g>

          <g className="ol-film-plan-elevation" filter="url(#ol-film-pencil-soft)">
            <motion.path
              animate={showPlan ? "visible" : "hidden"}
              className="ol-film-stroke ol-film-stroke-gold"
              custom={0.4}
              d="M878 478 L882 222 Q960 188 1042 182 L1118 202 L1120 478 Z"
              initial="hidden"
              variants={pencilDraw}
            />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.46} d="M922 478 V322 H1078 V478" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke" custom={0.5} d="M962 478 V362 H1038 V478" initial="hidden" variants={pencilDraw} />
          </g>

          <g className="ol-film-section">
            <motion.line animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-section" custom={0.54} initial="hidden" variants={pencilDraw} x1={138} x2={142} y1={140} y2={520} />
            <motion.line animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-section" custom={0.56} initial="hidden" variants={pencilDraw} x1={638} x2={642} y1={140} y2={520} />
          </g>

          <g className="ol-film-dims">
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-dim" custom={0.58} d="M182 542 H618 M182 550 V534 M618 550 V534" initial="hidden" variants={pencilDraw} />
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-dim" custom={0.62} d="M138 182 V416 M130 182 H146 M130 416 H146" initial="hidden" variants={pencilDraw} />
            <text className="ol-film-annotation ol-film-annotation-sketch" x={358} y={568}>
              14.2m
            </text>
            <text className="ol-film-annotation ol-film-annotation-sketch" x={108} y={308}>
              8.4m
            </text>
          </g>

          <text className="ol-film-annotation ol-film-annotation-title ol-film-annotation-sketch" x={198} y={128}>
            VILLA TYPE A — GROUND FLOOR
          </text>
          <text className="ol-film-annotation ol-film-annotation-sketch" x={218} y={248}>
            LIVING
          </text>
          <text className="ol-film-annotation ol-film-annotation-sketch" x={438} y={248}>
            MASTER SUITE
          </text>
          <text className="ol-film-annotation ol-film-annotation-sketch" x={688} y={418}>
            POOL
          </text>
          <text className="ol-film-annotation ol-film-annotation-sketch" x={918} y={158}>
            ELEVATION A
          </text>

          <g className="ol-film-north">
            <motion.path animate={showPlan ? "visible" : "hidden"} className="ol-film-stroke ol-film-stroke-gold" custom={0.66} d="M1048 558 L1048 522 M1028 542 L1048 522 L1068 542" initial="hidden" variants={pencilDraw} />
            <text className="ol-film-annotation ol-film-annotation-n ol-film-annotation-sketch" x={1040} y={578}>
              N
            </text>
          </g>
        </svg>
      ) : null}
    </div>
  );
}
