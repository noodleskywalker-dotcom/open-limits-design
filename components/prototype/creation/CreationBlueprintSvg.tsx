"use client";

import { motion } from "framer-motion";
import type { CreationPhase } from "@/lib/prototype/creation/creation-constants";
import { creationPhaseAtOrAfter, phaseProgress } from "@/lib/prototype/creation/creation-constants";

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

function strokeColor(transformT: number, base: "gold" | "room" | "pool" | "dim" | "default") {
  const warm = transformT > 0.15;
  if (base === "gold") return warm ? "rgb(200 162 74 / 92%)" : "rgb(200 162 74 / 92%)";
  if (base === "pool") return warm ? "rgb(106 154 184 / 85%)" : "rgb(90 200 255 / 68%)";
  if (base === "dim") return warm ? "rgb(200 162 74 / 55%)" : "rgb(140 190 235 / 45%)";
  if (base === "room") return warm ? "rgb(240 236 228 / 78%)" : "rgb(100 170 235 / 72%)";
  return warm ? "rgb(240 236 228 / 82%)" : "rgb(120 185 240 / 82%)";
}

export default function CreationBlueprintSvg({ phase, elapsed }: CreationBlueprintSvgProps) {
  const showPencil = phase === "pencil";
  const showPlan = creationPhaseAtOrAfter(phase, "blueprint") && phase !== "brand" && phase !== "enter";
  const drawing = phase === "blueprint";
  const transformT = phaseProgress(elapsed, "transform", "villa");

  if (!showPencil && !showPlan) return null;

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
          <g className="olcrt-grid" opacity={drawing ? 0.5 : phase === "transform" ? 0.12 : 0.22}>
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

          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-gold"
            custom={0}
            d="M178 418 Q179 300 182 182 H618 Q620 300 618 418 H178 Z"
            initial="hidden"
            stroke={strokeColor(transformT, "gold")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke"
            custom={0.08}
            d="M378 182 Q380 300 382 418"
            initial="hidden"
            stroke={strokeColor(transformT, "default")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke"
            custom={0.12}
            d="M182 298 Q400 302 618 300"
            initial="hidden"
            stroke={strokeColor(transformT, "default")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-room"
            custom={0.16}
            d="M182 182 H378 Q382 240 378 298 H182 Z"
            initial="hidden"
            stroke={strokeColor(transformT, "room")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-room"
            custom={0.2}
            d="M382 182 H618 Q622 240 618 298 H382 Z"
            initial="hidden"
            stroke={strokeColor(transformT, "room")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-room"
            custom={0.24}
            d="M182 302 H378 V416 H182 Z"
            initial="hidden"
            stroke={strokeColor(transformT, "room")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-room"
            custom={0.28}
            d="M382 302 H618 V416 H382 Z"
            initial="hidden"
            stroke={strokeColor(transformT, "room")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-pool"
            custom={0.32}
            d="M662 342 H818 Q822 410 818 478 H662 Z"
            initial="hidden"
            stroke={strokeColor(transformT, "pool")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-gold"
            custom={0.38}
            d="M878 478 L882 222 Q960 188 1042 182 L1118 202 L1120 478 Z"
            initial="hidden"
            stroke={strokeColor(transformT, "gold")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-dim"
            custom={0.48}
            d="M182 542 H618 M182 550 V534 M618 550 V534"
            initial="hidden"
            stroke={strokeColor(transformT, "dim")}
            variants={draw}
          />
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-dim"
            custom={0.52}
            d="M138 182 V416 M130 182 H146 M130 416 H146"
            initial="hidden"
            stroke={strokeColor(transformT, "dim")}
            variants={draw}
          />

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
          <motion.path
            animate={drawing ? "visible" : "hidden"}
            className="olcrt-stroke olcrt-stroke-gold"
            custom={0.56}
            d="M1048 558 L1048 522 M1028 542 L1048 522 L1068 542"
            initial="hidden"
            stroke={strokeColor(transformT, "gold")}
            variants={draw}
          />
          <text className="olcrt-annotation olcrt-annotation-n" x={1040} y={578}>
            N
          </text>
        </svg>
      ) : null}
    </div>
  );
}
