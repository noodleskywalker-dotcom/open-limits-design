"use client";

import type { ReactNode } from "react";

type FilmStageProps = {
  children: ReactNode;
  isMobile?: boolean;
};

/** Stable 16:9 fullscreen stage — no layout collapse. */
export default function FilmStage({ children, isMobile }: FilmStageProps) {
  return (
    <div className={`olfg-stage-wrap ${isMobile ? "olfg-stage-wrap-mobile" : ""}`}>
      <div className="olfg-stage">{children}</div>
    </div>
  );
}
