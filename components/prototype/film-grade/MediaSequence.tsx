"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  clipForPhase,
  FILM_CLIPS,
  type FilmGradePhase,
  filmPhaseAtOrAfter
} from "@/lib/prototype/film-grade-constants";
import type { ClipMediaStatus } from "@/lib/prototype/useFilmMedia";

type MediaSequenceProps = {
  phase: FilmGradePhase;
  finalRenderUrl?: string | null;
  statusFor: (id: string) => ClipMediaStatus | undefined;
  isMobile: boolean;
};

function resolveImageSrc(
  clipStatus: ClipMediaStatus | undefined,
  clipPhase: FilmGradePhase,
  finalRenderUrl: string | null | undefined
): string {
  if (!clipStatus) return "";
  if (clipPhase === "exterior" && finalRenderUrl && clipStatus.state !== "video") {
    return finalRenderUrl;
  }
  return clipStatus.src;
}

function MediaLayer({
  clipPhase,
  active,
  src,
  useVideo,
  isMobile
}: {
  clipPhase: FilmGradePhase;
  active: boolean;
  src: string;
  useVideo: boolean;
  isMobile: boolean;
}) {
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
              y: isExterior ? "-1%" : 0,
              zIndex: 2
            }
          : { opacity: 0, scale: 1.03, zIndex: 1 }
      }
      className={`olfg-layer olfg-media-layer olfg-media-${clipPhase}`}
      initial={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.12, 1, 0.28, 1] }}
    >
      {useVideo ? (
        <video
          ref={videoRef}
          aria-hidden
          className="olfg-media-video"
          loop
          muted
          playsInline
          preload="auto"
          src={src}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img alt="" className="olfg-media-image" loading="eager" src={src} />
      )}
      <div className={`olfg-media-grade olfg-media-grade-${clipPhase}`} />
      <div className="olfg-media-veil" />
      {!isMobile ? <div className="olfg-media-shimmer" /> : null}
    </motion.div>
  );
}

/** Video/image sequence — crossfade stack, never black between clips. */
export default function MediaSequence({
  phase,
  finalRenderUrl,
  statusFor,
  isMobile
}: MediaSequenceProps) {
  const showMedia = filmPhaseAtOrAfter(phase, "structure") && phase !== "logo";

  useEffect(() => {
    for (const clip of FILM_CLIPS) {
      const status = statusFor(clip.id);
      if (status) {
        const img = new Image();
        img.src = resolveImageSrc(status, clip.phase, finalRenderUrl);
      }
    }
  }, [statusFor, finalRenderUrl]);

  return (
    <div aria-hidden className="olfg-media-stack">
      <div className="olfg-layer olfg-media-base" />

      {FILM_CLIPS.map((clip) => {
        const status = statusFor(clip.id);
        if (!status || !showMedia) return null;

        const active = phase === clip.phase;
        const src = resolveImageSrc(status, clip.phase, finalRenderUrl);
        const useVideo = status.state === "video" && active;

        return (
          <MediaLayer
            active={active}
            clipPhase={clip.phase}
            isMobile={isMobile}
            key={clip.id}
            src={useVideo ? status.src : src}
            useVideo={useVideo}
          />
        );
      })}

      <AnimatePresence>
        {phase === "logo" || phase === "enter" ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="olfg-layer olfg-media-fade-black"
            initial={{ opacity: 0 }}
            key="fade-black"
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
