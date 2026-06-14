"use client";

import { motion } from "framer-motion";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";
import VillaSilhouette from "@/components/prototype/cinematic-film/VillaSilhouette";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] as const }
  })
};

type LogoMorphProps = {
  phase: CinematicFilmPhase;
  logoImageUrl?: string | null;
  companyName?: string;
  tagline?: string;
};

/**
 * Iconic brand reveal:
 * Villa silhouette → edges glow → collapse → one gold line → logo draws → lockup
 */
export default function LogoMorph({
  phase,
  logoImageUrl,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits"
}: LogoMorphProps) {
  const show = phase === "brand" || phase === "enter";
  if (!show) return null;

  const showLogoImage = phase === "enter" && logoImageUrl;
  const brandPhase = phase === "brand";

  return (
    <div aria-hidden className="ol-film-brand-layer">
      <div className="ol-film-brand-bloom" />

      {/* Villa dissolves — logo was hidden inside architecture */}
      <motion.div
        animate={{ opacity: brandPhase ? 1 : 0.85, scale: brandPhase ? 1 : 0.98 }}
        className="ol-film-brand-villa-dissolve"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <VillaSilhouette
          collapsing={brandPhase}
          glowing={brandPhase}
          mode="morph"
          morphDelay={0.65}
        />
      </motion.div>

      <svg aria-hidden className="ol-film-svg ol-film-svg-morph" viewBox="0 0 1200 675">
        {/* Single gold line — remains after villa collapse */}
        <motion.line
          animate={
            show
              ? { opacity: 1, pathLength: 1, x1: 280, x2: 920 }
              : { opacity: 0, pathLength: 0 }
          }
          className="ol-film-morph-single-line"
          initial={{ opacity: 0, pathLength: 0, x1: 600, x2: 600 }}
          transition={{ delay: 0.85, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          x1="600"
          x2="600"
          y1="340"
          y2="340"
        />

        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-frame"
          custom={1.05}
          d="M380 372 H820 V308 H380 Z"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-frame"
          custom={1.18}
          d="M380 372 V398 H580"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate={show ? "visible" : "hidden"}
          className="ol-film-morph-logo-accent"
          custom={1.28}
          d="M420 340 H780"
          initial="hidden"
          variants={draw}
        />
      </svg>

      <motion.div
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        className="ol-film-brand-lockup"
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        transition={{ delay: 1.45, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
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
