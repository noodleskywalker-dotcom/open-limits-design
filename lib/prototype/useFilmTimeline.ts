"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  filmGradePhaseAtElapsed,
  type FilmGradePhase
} from "@/lib/prototype/film-grade-constants";

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

export function useFilmTimeline() {
  const [mounted, setMounted] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<FilmGradePhase>("idea");
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
      setElapsed(11000);
      return;
    }

    setPhase("idea");
    setElapsed(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const ms = now - (startRef.current ?? now);
      setElapsed(ms);
      const next = filmGradePhaseAtElapsed(ms);
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
