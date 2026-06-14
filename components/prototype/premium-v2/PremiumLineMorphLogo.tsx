"use client";

import { motion } from "framer-motion";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";

const morphLine = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.3, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

type PremiumLineMorphLogoProps = {
  phase: "collapse" | "morph" | "enter";
  logoImageUrl?: string | null;
  companyName?: string;
};

/** 8 — Architecture collapses to one line → line morphs into Open Limits Design logo. */
export default function PremiumLineMorphLogo({
  phase,
  logoImageUrl,
  companyName = "Open Limits Design"
}: PremiumLineMorphLogoProps) {
  const visible = phase === "morph" || phase === "enter";

  if (logoImageUrl && visible) {
    return (
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="pf2-logo-image"
        initial={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandLogoLines companyName={companyName} logoImageUrl={logoImageUrl} visible={visible} />
      </motion.div>
    );
  }

  return (
    <div className="pf2-logo-morph">
      {phase === "collapse" ? (
        <motion.div
          animate={{ opacity: 1, scaleX: 1 }}
          className="pf2-single-line"
          initial={{ opacity: 0, scaleX: 0.2 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : null}
      <svg aria-hidden className="pf2-logo-svg" viewBox="0 0 520 96">
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="pf2-logo-morph-stroke"
          custom={0}
          d="M40 48 H480"
          initial="hidden"
          variants={morphLine}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="pf2-logo-frame"
          custom={0.12}
          d="M24 56 H496 V20 H24 Z"
          initial="hidden"
          variants={morphLine}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="pf2-logo-frame"
          custom={0.22}
          d="M24 56 V72 H320"
          initial="hidden"
          variants={morphLine}
        />
        <motion.text
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          className="pf2-logo-word"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.55, duration: 0.9 }}
          x="40"
          y="52"
        >
          OPEN LIMITS
        </motion.text>
        <motion.text
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          className="pf2-logo-word pf2-logo-word-accent"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.72, duration: 0.9 }}
          x="310"
          y="52"
        >
          DESIGN
        </motion.text>
      </svg>
    </div>
  );
}
