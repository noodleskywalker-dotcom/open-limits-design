"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { CinematicFilmPhase } from "@/lib/prototype/cinematic-film-constants";

type CinematicTransitionBloomProps = {
  phase: CinematicFilmPhase;
};

/** Light bloom + blur flash on phase changes — hides hard layer swaps. */
export default function CinematicTransitionBloom({ phase }: CinematicTransitionBloomProps) {
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    setFlash((n) => n + 1);
  }, [phase]);

  return (
    <motion.div
      animate={{ opacity: [0, 0.55, 0], scale: [0.92, 1.08, 1.02] }}
      aria-hidden
      className="ol-film-transition-bloom"
      key={flash}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
