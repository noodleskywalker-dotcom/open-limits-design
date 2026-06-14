"use client";

import { useEffect } from "react";

type FilmControlsProps = {
  showEnter: boolean;
  onEnter: () => void;
  onSkip: () => void;
};

export default function FilmControls({ showEnter, onEnter, onSkip }: FilmControlsProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <>
      <button className="prototype-skip-fab olcf-skip" onClick={onSkip} type="button">
        Skip
      </button>

      {showEnter ? (
        <div className="olcf-enter-wrap">
          <button className="olcf-enter-btn" onClick={onEnter} type="button">
            Enter Experience
          </button>
        </div>
      ) : null}
    </>
  );
}
