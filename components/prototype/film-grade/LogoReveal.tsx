"use client";

import { motion } from "framer-motion";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";
import type { FilmGradePhase } from "@/lib/prototype/film-grade-constants";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1, delay, ease: [0.16, 1, 0.3, 1] as const }
  })
};

type LogoRevealProps = {
  phase: FilmGradePhase;
  companyName?: string;
  tagline?: string;
  logoImageUrl?: string | null;
};

export default function LogoReveal({
  phase,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits",
  logoImageUrl
}: LogoRevealProps) {
  const show = phase === "logo" || phase === "enter";
  if (!show) return null;

  const showLogoImage = phase === "enter" && logoImageUrl;

  return (
    <div aria-hidden className="olfg-layer olfg-logo-layer">
      <div className="olfg-logo-bloom" />

      <svg className="olfg-svg olfg-svg-logo" viewBox="0 0 1200 675">
        <motion.line
          animate={{ opacity: 1, x1: 280, x2: 920 }}
          className="olfg-logo-gold-line"
          initial={{ opacity: 0, x1: 600, x2: 600 }}
          transition={{ delay: 0.15, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          x1="600"
          x2="600"
          y1="338"
          y2="338"
        />
        <motion.path
          animate="visible"
          className="olfg-logo-frame"
          custom={0.35}
          d="M380 370 H820 V306 H380 Z"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate="visible"
          className="olfg-logo-frame"
          custom={0.48}
          d="M380 370 V396 H580"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate="visible"
          className="olfg-logo-accent"
          custom={0.58}
          d="M420 338 H780"
          initial="hidden"
          variants={draw}
        />
      </svg>

      <motion.div
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        className="olfg-logo-lockup"
        initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
        transition={{ delay: 0.75, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {showLogoImage ? (
          <BrandLogoLines companyName={companyName} logoImageUrl={logoImageUrl} visible={show} />
        ) : (
          <>
            <h1 className="olfg-logo-name">{companyName.toUpperCase()}</h1>
            <p className="olfg-logo-tag">{tagline}</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
