"use client";

import { useEffect, useState } from "react";
import { CLIENT_FILM_CLIPS } from "@/lib/prototype/client-film-constants";

export type ClientMediaLoadState = "loading" | "video" | "poster" | "fallback";

export type ClientClipMediaStatus = {
  id: string;
  state: ClientMediaLoadState;
  src: string;
};

export function useClientFilmMedia() {
  const [statuses, setStatuses] = useState<ClientClipMediaStatus[]>(() =>
    CLIENT_FILM_CLIPS.map((c) => ({ id: c.id, state: "loading", src: c.poster }))
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

    async function resolveClip(
      clip: (typeof CLIENT_FILM_CLIPS)[number]
    ): Promise<ClientClipMediaStatus> {
      if (await probeUrl(clip.video)) {
        return { id: clip.id, state: "video", src: clip.video };
      }
      if (await probeUrl(clip.poster)) {
        return { id: clip.id, state: "poster", src: clip.poster };
      }
      return { id: clip.id, state: "fallback", src: clip.fallbackImage };
    }

    Promise.all(CLIENT_FILM_CLIPS.map(resolveClip)).then((results) => {
      if (!cancelled) {
        setStatuses(results);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function statusFor(id: string): ClientClipMediaStatus | undefined {
    return statuses.find((s) => s.id === id);
  }

  const missingVideos = statuses.filter((s) => s.state !== "video").map((s) => s.id);

  return { statusFor, ready, missingVideos };
}
