"use client";

import { motion } from "framer-motion";
import type { IntroPhase } from "@/lib/intro/constants";

type IntroSceneLayersProps = {
  phase: IntroPhase;
  finalRenderUrl?: string | null;
};

export default function IntroSceneLayers({ phase, finalRenderUrl }: IntroSceneLayersProps) {
  const structureUp = phase === "structure" || phase === "interior" || phase === "masterpiece";
  const interiorOn = phase === "interior" || phase === "masterpiece";
  const exteriorOn = phase === "masterpiece";
  const hideScene = phase === "brand" || phase === "enter";

  return (
    <div aria-hidden className={`ols-scene-layers ${hideScene ? "ols-scene-layers-hide" : ""}`}>
      {/* Sequence 2 — structure rises */}
      <motion.div
        animate={{
          opacity: structureUp ? 1 : 0,
          y: structureUp ? 0 : 40,
          scale: structureUp ? 1 : 0.92
        }}
        className="ols-structure-layer"
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="ols-iso-villa">
          <div className="ols-iso-wall ols-iso-wall-a" />
          <div className="ols-iso-wall ols-iso-wall-b" />
          <div className="ols-iso-wall ols-iso-wall-c" />
          <div className="ols-iso-column ols-iso-column-1" />
          <div className="ols-iso-column ols-iso-column-2" />
          <div className="ols-iso-column ols-iso-column-3" />
          <div className="ols-iso-glass ols-iso-glass-1" />
          <div className="ols-iso-glass ols-iso-glass-2" />
          <div className="ols-iso-roof" />
          <div className="ols-iso-light ols-iso-light-1" />
          <div className="ols-iso-light ols-iso-light-2" />
        </div>
      </motion.div>

      {/* Sequence 3 — interior */}
      <motion.div
        animate={{ opacity: interiorOn ? 1 : 0 }}
        className="ols-interior-layer"
        initial={{ opacity: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      >
        <div className="ols-interior-room">
          <div className="ols-interior-marble" />
          <div className="ols-interior-wood" />
          <div className="ols-interior-sofa" />
          <div className="ols-interior-table" />
          <div className="ols-interior-pendant" />
          <div className="ols-interior-rug" />
          <div className="ols-interior-glow" />
        </div>
        <div className="ols-specialty-tags">
          <span>Architecture</span>
          <span>Interior Design</span>
          <span>Furniture</span>
        </div>
      </motion.div>

      {/* Sequence 4 — masterpiece exterior */}
      <motion.div
        animate={{ opacity: exteriorOn ? 1 : 0, scale: exteriorOn ? 1 : 1.04 }}
        className="ols-exterior-layer"
        initial={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {finalRenderUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="ols-exterior-photo" src={finalRenderUrl} />
        ) : null}
        <div className="ols-exterior-villa">
          <div className="ols-exterior-sky" />
          <div className="ols-exterior-sun" />
          <div className="ols-exterior-building">
            <div className="ols-exterior-facade" />
            <div className="ols-exterior-windows">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="ols-exterior-pool" />
            <div className="ols-exterior-landscape" />
          </div>
          <div className="ols-exterior-vignette" />
        </div>
      </motion.div>
    </div>
  );
}
