"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import PremiumFilmEffects, { PremiumFilmVignette } from "@/components/prototype/premium-v2/PremiumFilmEffects";
import PremiumFilmScene from "@/components/prototype/premium-v2/PremiumFilmScene";
import PremiumLineMorphLogo from "@/components/prototype/premium-v2/PremiumLineMorphLogo";
import {
  PREMIUM_V2_DURATION_MS,
  PREMIUM_V2_PHASE_START_MS,
  phaseShowsAtmosphere
} from "@/lib/prototype/premium-v2-constants";
import { usePremiumV2PhaseEngine } from "@/lib/prototype/usePremiumV2PhaseEngine";

function playPencilScratch() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(max-width: 768px)").matches) return;
  try {
    const ctx = new AudioContext();
    const duration = 1.4;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2) * 0.01;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    window.setTimeout(() => void ctx.close(), (duration + 0.1) * 1000);
  } catch {
    /* optional */
  }
}

type PremiumFilmIntroProps = {
  onEnter: () => void;
  finalRenderUrl?: string | null;
  logoImageUrl?: string | null;
  companyName?: string;
  subtitle?: string;
  debug?: boolean;
};

export default function PremiumFilmIntro({
  onEnter,
  finalRenderUrl,
  logoImageUrl,
  companyName = "Open Limits Design",
  subtitle = "Architecture · Interior Design · Furniture",
  debug = false
}: PremiumFilmIntroProps) {
  const { mounted, isMobile, reducedMotion, phase } = usePremiumV2PhaseEngine();
  const [exiting, setExiting] = useState(false);
  const soundRef = useRef(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setExiting(true);
    window.setTimeout(onEnter, 720);
  }, [onEnter]);

  useEffect(() => {
    if (phase === "pencil" && !soundRef.current && !reducedMotion) {
      soundRef.current = true;
      playPencilScratch();
    }
  }, [phase, reducedMotion]);

  if (!mounted) return null;

  const showScene = phase !== "morph" && phase !== "enter";
  const showMorph = phase === "collapse" || phase === "morph" || phase === "enter";
  const showAtmosphere = phaseShowsAtmosphere(phase);

  return (
    <div
      aria-label="Open Limits Design premium launch film"
      className={`pf2-intro ${exiting ? "pf2-intro-exit" : ""} ${isMobile ? "pf2-intro-mobile" : ""}`}
      data-phase={phase}
      data-pf2-debug={debug ? "true" : undefined}
    >
      <PremiumFilmVignette phase={phase} />
      {!isMobile ? <div aria-hidden className="pf2-grain" /> : null}
      <PremiumFilmEffects active={showAtmosphere} isMobile={isMobile} />

      <button className="prototype-skip-fab" onClick={dismiss} type="button">
        Skip
      </button>

      <AnimatePresence mode="wait">
        {showScene ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="pf2-stage-wrap"
            exit={{ opacity: 0, scale: 0.97 }}
            initial={{ opacity: 1 }}
            key="scene"
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <PremiumFilmScene finalRenderUrl={finalRenderUrl} isMobile={isMobile} phase={phase} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showMorph ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="pf2-brand-wrap"
            initial={{ opacity: 0, y: 16 }}
            key="brand"
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <PremiumLineMorphLogo
              companyName={companyName}
              logoImageUrl={logoImageUrl}
              phase={phase === "enter" ? "enter" : phase === "morph" ? "morph" : "collapse"}
            />
            {(phase === "morph" || phase === "enter") && (
              <motion.p
                animate={{ opacity: 1 }}
                className="pf2-brand-sub"
                initial={{ opacity: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
              >
                {subtitle}
              </motion.p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "enter" && !reducedMotion ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="pf2-enter-panel"
            initial={{ opacity: 0 }}
            key="enter"
            transition={{ duration: 0.85 }}
          >
            <button className="button pf2-enter-button" onClick={dismiss} type="button">
              Enter Experience
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {reducedMotion ? (
        <div className="pf2-enter-panel">
          <button className="button pf2-enter-button" onClick={dismiss} type="button">
            Enter Experience
          </button>
        </div>
      ) : null}

      <aside className="prototype-timing-hud pf2-timing-hud">
        <strong>Premium v2 launch film</strong>
        <span>CTA at {(PREMIUM_V2_PHASE_START_MS.enter / 1000).toFixed(1)}s</span>
        <span>No auto-enter — click only</span>
        <span>
          Target {PREMIUM_V2_DURATION_MS.recommendedMin / 1000}–{PREMIUM_V2_DURATION_MS.recommendedMax / 1000}s arc
        </span>
      </aside>
    </div>
  );
}
