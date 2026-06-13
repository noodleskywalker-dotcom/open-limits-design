"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import SignatureBlueprintScene from "@/components/prototype/signature/SignatureBlueprintScene";
import SignatureLogoMorph from "@/components/prototype/signature/SignatureLogoMorph";
import {
  SIGNATURE_DURATION_MS,
  SIGNATURE_PHASE_START_MS,
  signaturePhaseAtElapsed,
  type SignaturePhase
} from "@/lib/prototype/signature-constants";

function subscribeToHydration(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("pageshow", onStoreChange);
  return () => window.removeEventListener("pageshow", onStoreChange);
}

function getClientMounted() {
  return true;
}

function getServerMounted() {
  return false;
}

function playPencilSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const duration = 2.2;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const t = i / ctx.sampleRate;
      const scratch = Math.sin(t * 120) * (Math.random() * 0.5 + 0.5);
      const env = Math.exp(-t * 1.4) * (1 - Math.exp(-t * 18));
      data[i] = scratch * env * 0.012;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2200;
    const gain = ctx.createGain();
    gain.gain.value = 0.28;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    window.setTimeout(() => void ctx.close(), (duration + 0.2) * 1000);
  } catch {
    /* optional */
  }
}

type SignatureOpenLimitsIntroProps = {
  onEnter: () => void;
};

export default function SignatureOpenLimitsIntro({ onEnter }: SignatureOpenLimitsIntroProps) {
  const mounted = useSyncExternalStore(subscribeToHydration, getClientMounted, getServerMounted);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<SignaturePhase>("paper");
  const [exiting, setExiting] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const soundRef = useRef(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setExiting(true);
    window.setTimeout(onEnter, 680);
  }, [onEnter]);

  useEffect(() => {
    if (!mounted || reducedMotion) {
      setPhase("enter");
      return;
    }

    startRef.current = performance.now();
    soundRef.current = false;

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const next = signaturePhaseAtElapsed(elapsed);
      setPhase(next);

      if ((next === "paper" || next === "sketch") && !soundRef.current) {
        soundRef.current = true;
        playPencilSound();
      }

      if (next !== "enter") {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, reducedMotion]);

  if (!mounted) return null;

  const showScene = phase !== "logo" && phase !== "enter";
  const showLogo = phase === "logo" || phase === "enter";

  return (
    <div
      aria-label="Open Limits Design signature intro prototype"
      className={`sig-intro ${exiting ? "sig-intro-exit" : ""}`}
      data-phase={phase}
    >
      <div aria-hidden className="sig-vignette" />
      <div aria-hidden className="sig-grain" />

      <AnimatePresence mode="wait">
        {showScene ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="sig-stage"
            exit={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            key="scene"
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignatureBlueprintScene phase={phase} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showLogo ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="sig-brand-stage"
            initial={{ opacity: 0, y: 20 }}
            key="brand"
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignatureLogoMorph visible={showLogo} />
            <motion.p
              animate={{ opacity: 1 }}
              className="sig-brand-sub"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
            >
              Architecture · Interior Design · Furniture
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "enter" ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="sig-enter-only"
            initial={{ opacity: 0 }}
            key="enter"
            transition={{ duration: 0.8 }}
          >
            <button className="button sig-enter-button" onClick={dismiss} type="button">
              Enter Showroom
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {reducedMotion ? (
        <div className="sig-enter-only">
          <button className="button sig-enter-button" onClick={dismiss} type="button">
            Enter Showroom
          </button>
        </div>
      ) : null}

      <aside className="prototype-timing-hud sig-timing-hud">
        <strong>Signature (code timings)</strong>
        <span>CTA at {(SIGNATURE_PHASE_START_MS.enter / 1000).toFixed(1)}s</span>
        <span>No auto-enter — click only</span>
        <span>Target {SIGNATURE_DURATION_MS.recommendedMin / 1000}–{SIGNATURE_DURATION_MS.recommendedMax / 1000}s arc</span>
      </aside>
    </div>
  );
}
