"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CLIENT_FILM_DURATION_MS,
  clientFilmPhaseAtElapsed,
  type ClientFilmPhase
} from "@/lib/prototype/client-film-constants";

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

export function useClientFilmTimeline() {
  const [mounted, setMounted] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
  const reducedMotionFromFramer = useReducedMotion();
  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : !!reducedMotionFromFramer;
  const [phase, setPhase] = useState<ClientFilmPhase>("idea");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (reducedMotion) {
      setPhase("enter");
      setElapsed(CLIENT_FILM_DURATION_MS.ctaVisible);
      return;
    }

    setPhase("idea");
    setElapsed(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const ms = now - (startRef.current ?? now);
      setElapsed(ms);
      const next = clientFilmPhaseAtElapsed(ms);
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

  return { mounted, isMobile, reducedMotion, phase, elapsed };
}
