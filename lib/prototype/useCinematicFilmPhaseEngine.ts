"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  cinematicFilmPhaseAtElapsed,
  type CinematicFilmPhase
} from "@/lib/prototype/cinematic-film-constants";

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

export function useCinematicFilmPhaseEngine() {
  const [mounted, setMounted] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<CinematicFilmPhase>("idea");
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || reducedMotion) {
      setPhase("enter");
      return;
    }

    setPhase("idea");
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const next = cinematicFilmPhaseAtElapsed(elapsed);
      setPhase(next);
      if (next !== "enter") {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, reducedMotion]);

  return { mounted, isMobile, reducedMotion, phase };
}
