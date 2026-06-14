"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import SignatureBlueprintScene from "@/components/prototype/signature/SignatureBlueprintScene";
import SignatureLogoMorph from "@/components/prototype/signature/SignatureLogoMorph";
import VillaBlueprintSvg from "@/components/home/intro/VillaBlueprintSvg";
import {
  PREMIUM_PHASE_START_MS,
  PREMIUM_DURATION_MS
} from "@/lib/prototype/premium-constants";
import {
  SIGNATURE_DURATION_MS,
  SIGNATURE_PHASE_START_MS,
  type SignaturePhase
} from "@/lib/prototype/signature-constants";
import { useSignaturePhaseEngine } from "@/lib/prototype/useSignaturePhaseEngine";

function playPencilSound() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(max-width: 768px)").matches) return;
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

export type SignatureIntroVariant = "signature" | "premium";

type SignatureOpenLimitsIntroProps = {
  onEnter: () => void;
  finalRenderUrl?: string | null;
  logoImageUrl?: string | null;
  companyName?: string;
  variant?: SignatureIntroVariant;
  detailedBlueprint?: boolean;
  headline?: string;
  subtitle?: string;
  timingLabel?: string;
  ctaMs?: number;
};

function mapPhaseForBlueprint(phase: SignaturePhase): "dark" | "blueprint" | "draw" | "structure" | "interior" | "masterpiece" | "brand" | "enter" {
  switch (phase) {
    case "paper":
      return "dark";
    case "sketch":
      return "draw";
    case "rise":
      return "structure";
    case "interior":
      return "interior";
    case "exterior":
      return "masterpiece";
    case "logo":
    case "enter":
      return "brand";
    default:
      return "blueprint";
  }
}

export default function SignatureOpenLimitsIntro({
  onEnter,
  finalRenderUrl,
  logoImageUrl,
  companyName = "Open Limits Design",
  variant = "signature",
  detailedBlueprint = false,
  headline = "Design Without Limits",
  subtitle = "Architecture · Interior Design · Furniture",
  timingLabel,
  ctaMs = SIGNATURE_PHASE_START_MS.enter
}: SignatureOpenLimitsIntroProps) {
  const { mounted, isMobile, reducedMotion, phase } = useSignaturePhaseEngine(variant);
  const [exiting, setExiting] = useState(false);
  const soundRef = useRef(false);
  const dismissedRef = useRef(false);
  const showDetailed = detailedBlueprint || variant === "premium";
  const resolvedCtaMs = variant === "premium" ? PREMIUM_PHASE_START_MS.enter : ctaMs;
  const durationMeta = variant === "premium" ? PREMIUM_DURATION_MS : SIGNATURE_DURATION_MS;

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setExiting(true);
    window.setTimeout(onEnter, 680);
  }, [onEnter]);

  useEffect(() => {
    if ((phase === "paper" || phase === "sketch") && !soundRef.current && !reducedMotion) {
      soundRef.current = true;
      playPencilSound();
    }
  }, [phase, reducedMotion]);

  if (!mounted) return null;

  const showScene = phase !== "logo" && phase !== "enter";
  const showLogo = phase === "logo" || phase === "enter";
  const hudLabel = timingLabel ?? (variant === "premium" ? "Premium hybrid (code timings)" : "Signature (code timings)");

  return (
    <div
      aria-label={`Open Limits Design ${variant} intro prototype`}
      className={`sig-intro ${exiting ? "sig-intro-exit" : ""} ${isMobile ? "sig-intro-mobile" : ""} ${variant === "premium" ? "sig-intro-premium" : ""}`}
      data-phase={phase}
    >
      <div aria-hidden className="sig-vignette" />
      {!isMobile ? <div aria-hidden className="sig-grain" /> : null}

      <button className="prototype-skip-fab" onClick={dismiss} type="button">
        Skip
      </button>

      <AnimatePresence mode="wait">
        {showScene ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="sig-stage"
            exit={{ opacity: 0, scale: 0.96, filter: isMobile ? "none" : "blur(6px)" }}
            initial={{ opacity: 0 }}
            key="scene"
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {showDetailed && (phase === "sketch" || phase === "rise") ? (
              <div className="sig-detailed-blueprint-layer">
                <VillaBlueprintSvg phase={mapPhaseForBlueprint(phase)} />
              </div>
            ) : null}
            <SignatureBlueprintScene
              detailedBlueprint={showDetailed}
              finalRenderUrl={finalRenderUrl}
              isMobile={isMobile}
              phase={phase}
            />
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
            <SignatureLogoMorph
              companyName={companyName}
              logoImageUrl={logoImageUrl}
              premium={variant === "premium"}
              visible={showLogo}
            />
            <motion.p
              animate={{ opacity: 1 }}
              className="sig-brand-sub"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
            >
              {subtitle}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "enter" && !reducedMotion ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="sig-enter-only"
            initial={{ opacity: 0 }}
            key="enter"
            transition={{ duration: 0.8 }}
          >
            {variant === "premium" ? (
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="sig-enter-headline"
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.1, duration: 0.7 }}
              >
                {headline}
              </motion.p>
            ) : null}
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
        <strong>{hudLabel}</strong>
        <span>CTA at {(resolvedCtaMs / 1000).toFixed(1)}s</span>
        <span>No auto-enter — click only</span>
        <span>
          Target {durationMeta.recommendedMin / 1000}–{durationMeta.recommendedMax / 1000}s arc
        </span>
      </aside>
    </div>
  );
}
