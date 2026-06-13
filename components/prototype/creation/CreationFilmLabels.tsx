"use client";

import type { ReactNode } from "react";
import { beatProgress, type FilmBeat } from "@/lib/prototype/creation/creation-constants";
import {
  BLUEPRINT_SCALE,
  BLUEPRINT_TITLE,
  VILLA_ELEMENTS,
  VIEW_H,
  VIEW_W
} from "@/lib/prototype/creation/villa-geometry";

type CreationFilmLabelsProps = {
  elapsed: number;
  beat: FilmBeat;
};

function Label({
  x,
  y,
  children,
  className = "olcrt-annotation",
  opacity = 1
}: {
  x: number;
  y: number;
  children: ReactNode;
  className?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        left: `${(x / VIEW_W) * 100}%`,
        opacity,
        top: `${(y / VIEW_H) * 100}%`
      }}
    >
      {children}
    </div>
  );
}

/** Architect sheet annotations — positions from geometry only. */
export default function CreationFilmLabels({ elapsed, beat }: CreationFilmLabelsProps) {
  const drawT = beatProgress(elapsed, "drawing", "moment");
  const momentT = beatProgress(elapsed, "moment", "architecture");
  const archT = beatProgress(elapsed, "architecture", "identity");

  if (beat === "opening" || beat === "identity" || beat === "end") return null;

  const labelOpacity =
    beat === "drawing"
      ? Math.min(1, drawT * 1.8)
      : beat === "moment"
        ? Math.max(0, 1 - momentT * 1.6)
        : Math.max(0, 0.35 * (1 - archT));

  if (labelOpacity <= 0.02) return null;

  return (
    <div aria-hidden className="olcrt-film-labels">
      <Label className="olcrt-annotation olcrt-annotation-title" opacity={labelOpacity} x={198} y={128}>
        {BLUEPRINT_TITLE}
      </Label>
      <Label opacity={labelOpacity} x={100} y={568}>
        {BLUEPRINT_SCALE}
      </Label>
      <Label className="olcrt-annotation olcrt-annotation-n" opacity={labelOpacity} x={1040} y={578}>
        N
      </Label>
      <Label opacity={labelOpacity} x={400} y={538}>
        14.2m
      </Label>
      <Label opacity={labelOpacity} x={130} y={300}>
        7.8m
      </Label>

      {VILLA_ELEMENTS.filter((e) => e.label).map((el) => {
        const s = el.solid;
        const x = s ? s.x + 24 : el.segments[0].from[0] + 20;
        const y = s ? s.y + 36 : el.segments[0].from[1] + 20;
        return (
          <Label key={el.id} opacity={labelOpacity * 0.85} x={x} y={y}>
            {el.label}
          </Label>
        );
      })}
    </div>
  );
}
