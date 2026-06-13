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
};

export default function MediaLayer({
  clipPhase,
  active,
  src,
  useVideo,
  isMobile
}: MediaLayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isExterior = clipPhase === "exterior";

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

  return (
    <motion.div
      animate={
        active
          ? {
              opacity: 1,
              scale: isExterior ? 1.1 : 1.06,
              x: isExterior ? "-1.5%" : "-0.8%",
              y: isExterior ? "-1%" : 0
            }
          : { opacity: 0, scale: 1.03 }
      }
      className={`olcf-layer olcf-media-layer olcf-media-${clipPhase}`}
      initial={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.12, 1, 0.28, 1] }}
    >
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
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img alt="" className="olcf-media-image" loading="eager" src={src} />
      )}
      <div className={`olcf-media-grade olcf-media-grade-${clipPhase}`} />
      <div className="olcf-media-veil" />
      {!isMobile ? <div className="olcf-media-shimmer" /> : null}
    </motion.div>
  );
}
