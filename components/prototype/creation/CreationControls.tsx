"use client";

import { useEffect } from "react";

type CreationControlsProps = {
  showEnter: boolean;
  onEnter: () => void;
  onSkip: () => void;
};

export default function CreationControls({ showEnter, onEnter, onSkip }: CreationControlsProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <>
      <button className="prototype-skip-fab olcrt-skip" onClick={onSkip} type="button">
        Skip
      </button>

      {showEnter ? (
        <div className="olcrt-enter-wrap">
          <button className="olcrt-enter-btn" onClick={onEnter} type="button">
            Enter Experience
          </button>
        </div>
      ) : null}
    </>
  );
}
