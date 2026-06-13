"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ClientFilmPhase } from "@/lib/prototype/client-film-constants";

type MediaLayerProps = {
  clipPhase: ClientFilmPhase;
  active: boolean;
  src: string;
  useVideo: boolean;
  isMobile: boolean;
  phaseElapsed: number;
};

const KEN_BURNS: Partial<
  Record<
    ClientFilmPhase,
    { scale: [number, number]; x: [string, string]; y: [string, string]; duration: number }
  >
> = {
  interior: {
    scale: [1.02, 1.14],
    x: ["0%", "-2.5%"],
    y: ["0%", "-1.2%"],
    duration: 2.4
  },
  exterior: {
    scale: [1.04, 1.16],
    x: ["0%", "-3.5%"],
    y: ["0%", "-1.8%"],
    duration: 2.4
  }
};

export default function MediaLayer({
  clipPhase,
  active,
  src,
  useVideo,
  isMobile,
  phaseElapsed
}: MediaLayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const kenBurns = KEN_BURNS[clipPhase];
  const useKenBurns = !useVideo && !!kenBurns && !isMobile;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !useVideo) return;
    if (active) {
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [active, useVideo]);

  if (!src) return null;

  const kenProgress = useKenBurns && active ? Math.min(1, phaseElapsed / (kenBurns.duration * 1000)) : 0;

  return (
    <motion.div
      animate={active ? { opacity: 1 } : { opacity: 0 }}
      className={`olcf-layer olcf-media-layer olcf-media-${clipPhase}`}
      initial={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: [0.12, 1, 0.28, 1] }}
    >
      <div className="olcf-media-frame">
        {useVideo ? (
          <video
            ref={videoRef}
            aria-hidden
            className="olcf-media-video"
            loop
            muted
            playsInline
            preload="auto"
            src={src}
          />
        ) : useKenBurns ? (
          <motion.div
            animate={{
              scale: kenBurns.scale[0] + (kenBurns.scale[1] - kenBurns.scale[0]) * kenProgress,
              x: kenProgress > 0 ? kenBurns.x[1] : kenBurns.x[0],
              y: kenProgress > 0 ? kenBurns.y[1] : kenBurns.y[0]
            }}
            className="olcf-media-kenburns"
            initial={{ scale: kenBurns.scale[0], x: kenBurns.x[0], y: kenBurns.y[0] }}
            transition={{ duration: 0.12, ease: "linear" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="olcf-media-image" loading="eager" src={src} />
          </motion.div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img alt="" className="olcf-media-image" loading="eager" src={src} />
        )}
      </div>
      <div className={`olcf-media-grade olcf-media-grade-${clipPhase}`} />
      <div className="olcf-media-veil" />
      {!isMobile ? <div className="olcf-media-shimmer" /> : null}
    </motion.div>
  );
}
