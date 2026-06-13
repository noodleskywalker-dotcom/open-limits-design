"use client";

import { motion } from "framer-motion";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";

const morph = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

type LogoMorphProps = {
  phase: CinematicFilmPhase;
  logoImageUrl?: string | null;
  companyName?: string;
  tagline?: string;
};

/** Architecture dissolves into brand — line convergence → logo. */
export default function LogoMorph({
  phase,
  logoImageUrl,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits"
}: LogoMorphProps) {
  const show = phase === "brand" || phase === "enter";
  if (!show) return null;

  const showLogo = phase === "enter" && logoImageUrl;

  return (
    <div aria-hidden className="ol-film-brand-layer">
      {/* Converging architectural lines */}
      <svg className="ol-film-svg ol-film-svg-morph" viewBox="0 0 1200 675">
        <motion.line
          animate={{ opacity: [0.8, 0], pathLength: [1, 0.2] }}
          className="ol-film-morph-line ol-film-morph-line-a"
          initial={{ opacity: 0, pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          x1="180"
          x2="600"
          y1="420"
          y2="338"
        />
        <motion.line
          animate={{ opacity: [0.8, 0], pathLength: [1, 0.2] }}
          className="ol-film-morph-line ol-film-morph-line-b"
          initial={{ opacity: 0, pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          x1="620"
          x2="600"
          y1="180"
          y2="338"
        />
        <motion.line
          animate={{ opacity: [0.8, 0], pathLength: [1, 0.2] }}
          className="ol-film-morph-line ol-film-morph-line-c"
          initial={{ opacity: 0, pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          x1="1040"
          x2="600"
          y1="220"
          y2="338"
        />
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-stroke"
          custom={0.35}
          d="M420 338 H780"
          initial="hidden"
          variants={morph}
        />
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-frame"
          custom={0.45}
          d="M400 370 H800 V310 H400 Z"
          initial="hidden"
          variants={morph}
        />
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-frame"
          custom={0.55}
          d="M400 370 V395 H620"
          initial="hidden"
          variants={morph}
        />
      </svg>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="ol-film-brand-lockup"
        initial={{ opacity: 0, y: 12 }}
        transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        {showLogo ? (
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
