"use client";

import { motion } from "framer-motion";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";
import type { ClientFilmPhase } from "@/lib/prototype/client-film-constants";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1, delay, ease: [0.16, 1, 0.3, 1] as const }
  })
};

type LogoRevealProps = {
  phase: ClientFilmPhase;
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

  const isEnter = phase === "enter";
  const showLogoImage = isEnter && logoImageUrl;

  return (
    <div
      aria-hidden
      className={`olcf-layer olcf-logo-layer ${isEnter ? "olcf-logo-layer-enter" : ""}`}
    >
      <div className="olcf-logo-bloom" />
      <div className="olcf-logo-glow-ring" />

      <svg className="olcf-svg olcf-svg-logo" viewBox="0 0 1200 675">
        <motion.line
          animate={{ opacity: 1, x1: 280, x2: 920 }}
          className="olcf-logo-gold-line"
          initial={{ opacity: 0, x1: 600, x2: 600 }}
          transition={{ delay: 0.15, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          x1="600"
          x2="600"
          y1="338"
          y2="338"
        />
        <motion.path
          animate="visible"
          className="olcf-logo-frame"
          custom={0.35}
          d="M380 370 H820 V306 H380 Z"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate="visible"
          className="olcf-logo-frame"
          custom={0.48}
          d="M380 370 V396 H580"
          initial="hidden"
          variants={draw}
        />
        <motion.path
          animate="visible"
          className="olcf-logo-accent"
          custom={0.58}
          d="M420 338 H780"
          initial="hidden"
          variants={draw}
        />
      </svg>

      <motion.div
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        className="olcf-logo-lockup"
        initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
        transition={{ delay: 0.75, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="olcf-logo-rule olcf-logo-rule-left" />
        <div className="olcf-logo-rule olcf-logo-rule-right" />

        {showLogoImage ? (
          <BrandLogoLines companyName={companyName} logoImageUrl={logoImageUrl} visible={show} />
        ) : (
          <>
            <h1 className="olcf-logo-name">{companyName.toUpperCase()}</h1>
            <p className={`olcf-logo-tag ${isEnter ? "olcf-logo-tag-enter" : ""}`}>{tagline}</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
