"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { PremiumV2Phase } from "@/lib/prototype/premium-v2-constants";

type PremiumFilmEffectsProps = {
  active: boolean;
  isMobile: boolean;
};

export default function PremiumFilmEffects({ active, isMobile }: PremiumFilmEffectsProps) {
  if (!active) return null;

  const dustCount = isMobile ? 12 : 28;

  return (
    <div aria-hidden className="pf2-effects">
      <div className="pf2-light-beam pf2-light-beam-a" />
      <div className="pf2-light-beam pf2-light-beam-b" />
      <div className="pf2-light-beam pf2-light-beam-c" />
      <div className="pf2-dust-field">
        {Array.from({ length: dustCount }, (_, i) => (
          <span className="pf2-dust" key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

export function PremiumFilmVignette({ phase }: { phase: PremiumV2Phase }) {
  const cinematic = phase === "walkthrough" || phase === "exterior" || phase === "collapse";
  return (
    <motion.div
      animate={{ opacity: cinematic ? 0.85 : 1 }}
      aria-hidden
      className="pf2-vignette"
      transition={{ duration: 1.2 }}
    />
  );
}
