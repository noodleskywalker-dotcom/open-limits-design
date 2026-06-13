"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VIDEO_INTRO_CTA_LEAD_S,
  VIDEO_INTRO_FADE_OUT_MS,
  VIDEO_INTRO_SRC
} from "@/lib/intro/video-intro-constants";

type OpenLimitsVideoIntroProps = {
  companyName: string;
  logoImageUrl?: string | null;
  onEnter: () => void;
};

export default function OpenLimitsVideoIntro({
  companyName,
  logoImageUrl,
  onEnter
}: OpenLimitsVideoIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [failed, setFailed] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const finish = useCallback(
    (immediate: boolean) => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      const video = videoRef.current;
      if (video) video.pause();
      if (immediate) {
        onEnter();
        return;
      }
      setExiting(true);
      window.setTimeout(onEnter, VIDEO_INTRO_FADE_OUT_MS);
    },
    [onEnter]
  );

  const handleSkip = useCallback(() => finish(true), [finish]);
  const handleEnter = useCallback(() => finish(false), [finish]);

  useEffect(() => {
    if (failed) {
      setShowCta(true);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const revealCta = () => setShowCta(true);

    const onTimeUpdate = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (video.duration - video.currentTime <= VIDEO_INTRO_CTA_LEAD_S) revealCta();
    };

    const onEnded = () => {
      revealCta();
      video.pause();
    };

    const onError = () => setFailed(true);

    const tryPlay = () => {
      void video.play().catch(() => {
        /* Autoplay may defer — not a hard failure until error event */
      });
    };

    const onLoadedData = () => tryPlay();

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("loadeddata", onLoadedData);

    if (video.readyState >= 2) tryPlay();

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [failed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip]);

  return (
    <div
      aria-label="Open Limits Design intro film"
      className={`ol-vintro-root ${visible ? "ol-vintro-root-in" : ""} ${exiting ? "ol-vintro-root-out" : ""}`}
    >
      <div className="ol-vintro-backdrop" />

      {!failed ? (
        <video
          ref={videoRef}
          autoPlay
          className="ol-vintro-video"
          muted
          playsInline
          preload="auto"
          src={VIDEO_INTRO_SRC}
        />
      ) : null}

      {failed ? (
        <div aria-hidden className="ol-vintro-fallback">
          {logoImageUrl ? (
            <img alt="" className="ol-vintro-fallback-logo" src={logoImageUrl} />
          ) : (
            <p className="ol-vintro-fallback-name">{companyName.toUpperCase()}</p>
          )}
        </div>
      ) : null}

      {showCta ? (
        <div className="ol-vintro-cta">
          <h1 className="ol-vintro-title">{companyName.toUpperCase()}</h1>
          <button className="ol-vintro-enter" onClick={handleEnter} type="button">
            Enter Experience
          </button>
        </div>
      ) : null}

      <button className="ol-vintro-skip" onClick={handleSkip} type="button">
        Skip
      </button>
    </div>
  );
}
