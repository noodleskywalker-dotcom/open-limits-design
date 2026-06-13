"use client";

import { motion } from "framer-motion";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] as const }
  })
};

type LogoMorphProps = {
  phase: CinematicFilmPhase;
  logoImageUrl?: string | null;
  companyName?: string;
  tagline?: string;
};

/** Building collapses to one line → line becomes logo frame → lockup. */
export default function LogoMorph({
  phase,
  logoImageUrl,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits"
}: LogoMorphProps) {
  const show = phase === "brand" || phase === "enter";
  if (!show) return null;

  const showLogoImage = phase === "enter" && logoImageUrl;
  const collapsing = phase === "brand";

  return (
    <div aria-hidden className="ol-film-brand-layer">
      <div className="ol-film-brand-bloom" />

      <svg className="ol-film-svg ol-film-svg-morph" viewBox="0 0 1200 675">
        {/* Collapse — architecture lines travel inward */}
        {[
          { x1: 180, y1: 420, delay: 0 },
          { x1: 620, y1: 180, delay: 0.04 },
          { x1: 380, y1: 300, delay: 0.08 },
          { x1: 1040, y1: 220, delay: 0.12 },
          { x1: 820, y1: 480, delay: 0.16 },
          { x1: 180, y1: 180, delay: 0.2 }
        ].map((line, i) => (
          <motion.line
            animate={
              collapsing
                ? { x2: 600, y2: 338, opacity: [0.85, 0], pathLength: [1, 0.15] }
                : { opacity: 0, pathLength: 0 }
            }
            className="ol-film-morph-line"
            initial={{ opacity: 0, pathLength: 1 }}
            key={i}
            transition={{ duration: 1.2, delay: line.delay, ease: [0.16, 1, 0.3, 1] }}
            x1={line.x1}
            x2={line.x1}
            y1={line.y1}
            y2={line.y1}
          />
        ))}

        {/* Single elegant line — born from collapse */}
        <motion.line
          animate={show ? { opacity: 1, pathLength: 1, scaleX: 1 } : { opacity: 0, pathLength: 0 }}
          className="ol-film-morph-single-line"
          initial={{ opacity: 0, pathLength: 0, scaleX: 0.2 }}
          style={{ originX: 0.5 }}
          transition={{ delay: 0.55, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          x1="320"
          x2="880"
          y1="338"
          y2="338"
        />

        {/* Line becomes logo frame */}
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-frame"
          custom={0.75}
          d="M380 372 H820 V308 H380 Z"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-frame"
          custom={0.88}
          d="M380 372 V398 H580"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-accent"
          custom={0.95}
          d="M420 338 H780"
          initial="hidden"
          variants={draw}
        />
      </svg>

      <motion.div
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        className="ol-film-brand-lockup"
        initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
        transition={{ delay: 1.05, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {showLogoImage ? (
          <BrandLogoLines companyName={companyName} logoImageUrl={logoImageUrl} visible={show} />
        ) : (
          <>
            <h1 className="ol-film-brand-name">{companyName.toUpperCase()}</h1>
            <p className="ol-film-brand-tag">{tagline}</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
