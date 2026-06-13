"use client";

import { useEffect, useState } from "react";
import { FILM_CLIPS } from "@/lib/prototype/film-grade-constants";

export type MediaLoadState = "loading" | "video" | "poster" | "fallback";

export type ClipMediaStatus = {
  id: string;
  state: MediaLoadState;
  src: string;
};

/** Probe video availability; fall back to poster then legacy image. */
export function useFilmMediaProbe() {
  const [statuses, setStatuses] = useState<ClipMediaStatus[]>(() =>
    FILM_CLIPS.map((c) => ({ id: c.id, state: "loading" as const, src: c.poster }))
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function probeUrl(url: string): Promise<boolean> {
      try {
        const res = await fetch(url, { method: "HEAD" });
        return res.ok;
      } catch {
        return false;
      }
    }

    async function resolveClip(clip: (typeof FILM_CLIPS)[number]): Promise<ClipMediaStatus> {
      const videoOk = await probeUrl(clip.video);
      if (videoOk) {
        return { id: clip.id, state: "video", src: clip.video };
      }
      const posterOk = await probeUrl(clip.poster);
      if (posterOk) {
        return { id: clip.id, state: "poster", src: clip.poster };
      }
      return { id: clip.id, state: "fallback", src: clip.fallbackImage };
    }

    Promise.all(FILM_CLIPS.map(resolveClip)).then((results) => {
      if (!cancelled) {
        setStatuses(results);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function statusFor(id: string): ClipMediaStatus | undefined {
    return statuses.find((s) => s.id === id);
  }

  const missingVideos = statuses.filter((s) => s.state !== "video").map((s) => s.id);

  return { statuses, statusFor, ready, missingVideos };
}
