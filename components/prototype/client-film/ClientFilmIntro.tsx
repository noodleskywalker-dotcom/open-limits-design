"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import BlueprintOverlay from "@/components/prototype/client-film/BlueprintOverlay";
import CinematicAtmosphere from "@/components/prototype/client-film/CinematicAtmosphere";
import FilmControls from "@/components/prototype/client-film/FilmControls";
import LogoReveal from "@/components/prototype/client-film/LogoReveal";
import MediaLayer from "@/components/prototype/client-film/MediaLayer";
import {
  CLIENT_FILM_CLIPS,
  CLIENT_FILM_DURATION_MS,
  CLIENT_FILM_STORAGE_KEY,
  clientClipForPhase,
  clientPhaseAtOrAfter,
  type ClientFilmPhase
} from "@/lib/prototype/client-film-constants";
import { useClientFilmMedia, type ClientClipMediaStatus } from "@/lib/prototype/useClientFilmMedia";
import { useClientFilmTimeline } from "@/lib/prototype/useClientFilmTimeline";

type ClientFilmIntroProps = {
  onEnter: () => void;
  companyName?: string;
  tagline?: string;
  logoImageUrl?: string | null;
  finalRenderUrl?: string | null;
  debug?: boolean;
};

function resolveImageSrc(
  status: ClientClipMediaStatus | undefined,
  clipPhase: ClientFilmPhase,
  finalRenderUrl: string | null | undefined
): string {
  if (!status) return "";
  if (clipPhase === "exterior" && finalRenderUrl && status.state !== "video") {
    return finalRenderUrl;
  }
  return status.src;
}

export default function ClientFilmIntro({
  onEnter,
  companyName = "Open Limits Design",
  tagline = "Design Without Limits",
  logoImageUrl,
  finalRenderUrl,
  debug = false
}: ClientFilmIntroProps) {
  const { mounted, isMobile, reducedMotion, phase } = useClientFilmTimeline();
  const { statusFor, ready, missingVideos } = useClientFilmMedia();
  const [exiting, setExiting] = useState(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      localStorage.setItem(CLIENT_FILM_STORAGE_KEY, String(Date.now()));
    } catch {
      /* optional */
    }
    setExiting(true);
    window.setTimeout(onEnter, 680);
  }, [onEnter]);

  const showMedia = clientPhaseAtOrAfter(phase, "structure") && phase !== "logo";
  const activeClip = clientClipForPhase(phase);
  const showBlueprint = phase !== "logo" && phase !== "enter";

  useEffect(() => {
    for (const clip of CLIENT_FILM_CLIPS) {
      const status = statusFor(clip.id);
      if (status) {
        const img = new Image();
        img.src = resolveImageSrc(status, clip.phase, finalRenderUrl);
      }
    }
  }, [statusFor, finalRenderUrl]);

  if (!mounted) {
    return <div aria-hidden className="olcf-root olcf-root-loading" />;
  }

  return (
    <div
      aria-label="Open Limits Design client film intro"
      className={`olcf-root ${exiting ? "olcf-root-exit" : ""} ${isMobile ? "olcf-root-mobile" : ""}`}
      data-olcf-debug={debug ? "true" : undefined}
      data-phase={phase}
    >
      <div className={`olcf-stage-wrap ${isMobile ? "olcf-stage-wrap-mobile" : ""}`}>
        <div className="olcf-stage">
          <div aria-hidden className="olcf-media-stack">
            <div className="olcf-layer olcf-media-base" />

            {CLIENT_FILM_CLIPS.map((clip) => {
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
                  className="olcf-layer olcf-media-fade-black"
                  initial={{ opacity: 0 }}
                  key="fade-black"
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
            </AnimatePresence>
          </div>

          {showBlueprint ? (
            <div className="olcf-layer olcf-blueprint-stack">
              <BlueprintOverlay phase={phase} />
            </div>
          ) : null}

          <CinematicAtmosphere isMobile={isMobile} phase={phase} />
        </div>
      </div>

      <LogoReveal
        companyName={companyName}
        logoImageUrl={logoImageUrl}
        phase={phase}
        tagline={tagline}
      />

      <FilmControls
        onEnter={dismiss}
        onSkip={dismiss}
        showEnter={phase === "enter" || !!reducedMotion}
      />

      {debug ? (
        <aside className="prototype-timing-hud olcf-debug-hud">
          <strong>Client film debug</strong>
          <span>Phase: {phase}</span>
          <span>Media probe: {ready ? "ready" : "loading"}</span>
          {missingVideos.length > 0 ? (
            <span>
              Film-grade media missing: using poster fallback ({missingVideos.join(", ")})
            </span>
          ) : (
            <span>All video clips loaded</span>
          )}
          {activeClip ? <span>Active clip: {activeClip.id}</span> : null}
          <span>CTA at {(CLIENT_FILM_DURATION_MS.ctaVisible / 1000).toFixed(1)}s</span>
        </aside>
      ) : null}
    </div>
  );
}
