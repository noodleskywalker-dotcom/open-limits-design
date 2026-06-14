"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { premiumPhaseAtElapsed } from "@/lib/prototype/premium-constants";
import {
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

function subscribeMobile(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(max-width: 768px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

type EngineVariant = "signature" | "premium";

export function useSignaturePhaseEngine(variant: EngineVariant = "signature") {
  const mounted = useSyncExternalStore(subscribeToHydration, getClientMounted, getServerMounted);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<SignaturePhase>("paper");
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mounted || reducedMotion) {
      setPhase("enter");
      return;
    }

    setPhase("paper");
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const next = (
        variant === "premium" ? premiumPhaseAtElapsed(elapsed) : signaturePhaseAtElapsed(elapsed)
      ) as SignaturePhase;
      setPhase(next);
      if (next !== "enter") {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, reducedMotion, variant]);

  return { mounted, isMobile, reducedMotion, phase };
}
