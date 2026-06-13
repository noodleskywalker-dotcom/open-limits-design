"use client";

import { beatProgress } from "@/lib/prototype/creation/creation-constants";
import { pencilState } from "@/lib/prototype/creation/film-draw";
import { VIEW_H, VIEW_W } from "@/lib/prototype/creation/villa-geometry";

type CreationFilmPencilProps = {
  elapsed: number;
};

/** Drafting pencil — hero of the opening. Follows geometry, not pathLength CSS. */
export default function CreationFilmPencil({ elapsed }: CreationFilmPencilProps) {
  const openingT = beatProgress(elapsed, "opening", "drawing");
  const drawT = beatProgress(elapsed, "drawing", "moment");
  const pencil = pencilState(elapsed);

  const showGoldPoint = elapsed >= 1400 && drawT < 1;
  const showPencil = pencil.visible && drawT < 1;

  if (!showGoldPoint && !showPencil) return null;

  const left = showPencil ? `${(pencil.x / VIEW_W) * 100}%` : "50%";
  const top = showPencil ? `${(pencil.y / VIEW_H) * 100}%` : "62%";
  const angle = showPencil ? -38 + pencil.pressure * 4 : 0;

  return (
    <>
      {showGoldPoint && openingT > 0.85 ? (
        <div
          aria-hidden
          className="olcrt-gold-point"
          style={{ opacity: Math.min(1, (openingT - 0.85) * 8) }}
        />
      ) : null}

      {showPencil ? (
        <div
          aria-hidden
          className="olcrt-film-pencil"
          style={{
            left,
            top,
            transform: `translate(-4px, -42px) rotate(${angle}deg)`,
            opacity: 0.92 + pencil.pressure * 0.08
          }}
        >
          <div className="olcrt-film-pencil-graphite" />
          <div className="olcrt-film-pencil-wood" />
          <div className="olcrt-film-pencil-tip" />
        </div>
      ) : null}
    </>
  );
}
