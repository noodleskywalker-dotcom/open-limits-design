"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { IntroSettings } from "@/lib/cms/types";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";
import IntroSceneLayers from "@/components/home/intro/IntroSceneLayers";
import VillaBlueprintSvg from "@/components/home/intro/VillaBlueprintSvg";
import {
  AUTO_ENTER_MS,
  INTRO_PHASE_ORDER,
  PHASE_START_MS,
  SERVICE_LINES,
  type IntroPhase
} from "@/lib/intro/constants";

type LuxuryIntroProps = {
  logoImageUrl: string | null;
  companyName: string;
  tagline: string;
  settings: IntroSettings;
  onRevealShowroom: () => void;
  onEnter: () => void;
};

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

function phaseAtElapsed(elapsed: number): IntroPhase {
  let current: IntroPhase = "dark";
  for (const phase of INTRO_PHASE_ORDER) {
    if (elapsed >= PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

/** Subtle drafting ambience — Web Audio, no external assets. */
function playDraftingAmbience() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const duration = 1.8;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const t = i / ctx.sampleRate;
      const envelope = Math.exp(-t * 2.2) * (1 - Math.exp(-t * 12));
      data[i] = (Math.random() * 2 - 1) * envelope * 0.018;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2800;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    window.setTimeout(() => void ctx.close(), (duration + 0.2) * 1000);
  } catch {
    /* Audio optional — silent fail */
  }
}

export default function LuxuryIntro({
  logoImageUrl,
  companyName,
  tagline,
  settings,
  onRevealShowroom,
  onEnter
}: LuxuryIntroProps) {
  const mounted = useSyncExternalStore(subscribeToHydration, getClientMounted, getServerMounted);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<IntroPhase>("dark");
  const [exiting, setExiting] = useState(false);
  const [ctaReady, setCtaReady] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const soundPlayedRef = useRef(false);
  const autoEnterRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (autoEnterRef.current) window.clearTimeout(autoEnterRef.current);
    setExiting(true);
    onRevealShowroom();
    window.setTimeout(onEnter, 720);
  }, [onEnter, onRevealShowroom]);

  useEffect(() => {
    if (!mounted || reducedMotion) {
      setPhase("enter");
      setCtaReady(true);
      return;
    }

    startRef.current = performance.now();
    soundPlayedRef.current = false;

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const next = phaseAtElapsed(elapsed);
      setPhase(next);

      if (next === "blueprint" && !soundPlayedRef.current) {
        soundPlayedRef.current = true;
        playDraftingAmbience();
      }

      if (next !== "enter") {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCtaReady(true);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, reducedMotion]);

  useEffect(() => {
    if (!ctaReady || reducedMotion) return;
    autoEnterRef.current = window.setTimeout(() => dismiss(), AUTO_ENTER_MS);
    return () => {
      if (autoEnterRef.current) window.clearTimeout(autoEnterRef.current);
    };
  }, [ctaReady, dismiss, reducedMotion]);

  if (!mounted) {
    return null;
  }

  const headline = settings.introTitle ?? "Design Without Limits";
  const subtitle = settings.introSubtitle ?? tagline;
  const showBlueprint =
    phase === "blueprint" ||
    phase === "draw" ||
    phase === "structure" ||
    phase === "interior" ||
    phase === "masterpiece";
  const showBrand = phase === "brand" || phase === "enter";
  const cameraPush =
    phase === "draw" ||
    phase === "structure" ||
    phase === "interior" ||
    phase === "masterpiece";

  return (
    <div
      aria-label="Open Limits Design cinematic intro"
      aria-modal="true"
      className={`ols-intro luxury-intro luxury-intro-mounted ${exiting ? "ols-intro-exit luxury-intro-exit" : ""}`}
      data-phase={phase}
      role="dialog"
    >
      <div aria-hidden className="ols-intro-vignette" />
      <div aria-hidden className="ols-intro-grain" />

      <motion.div
        animate={{ opacity: phase === "dark" ? 0 : 1 }}
        className="ols-intro-stage"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          animate={{
            scale: cameraPush ? 1.08 : showBrand ? 0.92 : 1,
            y: cameraPush ? -12 : 0,
            opacity: showBrand ? 0 : 1
          }}
          className="ols-intro-canvas"
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{
              opacity: showBlueprint ? 1 : 0,
              rotateX: showBlueprint ? 6 : 12,
              scale: showBlueprint ? 1 : 0.94
            }}
            className="ols-blueprint-paper"
            initial={{ opacity: 0, rotateX: 12, scale: 0.94 }}
            style={{ transformPerspective: 1200 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <VillaBlueprintSvg phase={phase} />
            <IntroSceneLayers finalRenderUrl={settings.finalRenderImageUrl} phase={phase} />
          </motion.div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showBrand ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="ols-brand-panel"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, y: 24 }}
            key="brand"
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <BrandLogoLines companyName={companyName} logoImageUrl={logoImageUrl} visible={showBrand} />
            <motion.p
              animate={{ opacity: 1 }}
              className="ols-brand-name"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
            >
              {companyName}
            </motion.p>
            <motion.ul
              animate={{ opacity: 1 }}
              className="ols-brand-services"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
            >
              {SERVICE_LINES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </motion.ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "enter" && !reducedMotion ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="ols-enter-panel"
            initial={{ opacity: 0, y: 16 }}
            key="enter"
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="ols-enter-headline">{headline}</p>
            {subtitle ? <p className="ols-enter-sub">{subtitle}</p> : null}
            <button className="button ols-enter-button" onClick={dismiss} type="button">
              Enter Showroom
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {reducedMotion ? (
        <div className="ols-enter-panel ols-enter-panel-static">
          <p className="ols-enter-headline">{headline}</p>
          <button className="button ols-enter-button" onClick={dismiss} type="button">
            Enter Showroom
          </button>
        </div>
      ) : null}
    </div>
  );
}
