"use client";

import { useCallback, useState } from "react";
import LuxuryIntro from "@/components/home/LuxuryIntro";
import PrototypeShowroomMock from "@/components/prototype/PrototypeShowroomMock";
import type { IntroSettings } from "@/lib/cms/types";
import { AUTO_ENTER_MS, PHASE_START_MS } from "@/lib/intro/constants";

const PROTOTYPE_SETTINGS: IntroSettings = {
  enabled: true,
  autoplayMs: 3200,
  introTitle: "Design Without Limits",
  introSubtitle: "Architecture · Interior Design · Furniture",
  blueprintImageUrl: null,
  finalRenderImageUrl: null
};

type PrototypeCinematicDemoProps = {
  companyName: string;
  logoImageUrl: string | null;
  tagline: string;
  finalRenderUrl?: string | null;
};

export default function PrototypeCinematicDemo({
  companyName,
  logoImageUrl,
  tagline,
  finalRenderUrl
}: PrototypeCinematicDemoProps) {
  const [runId, setRunId] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showShowroom, setShowShowroom] = useState(false);

  const replay = useCallback(() => {
    setShowIntro(true);
    setShowShowroom(false);
    setRunId((id) => id + 1);
  }, []);

  const settings: IntroSettings = {
    ...PROTOTYPE_SETTINGS,
    finalRenderImageUrl: finalRenderUrl ?? null
  };

  return (
    <div className="prototype-demo-shell">
      <div aria-hidden className="prototype-demo-badge">
        PR #9 · Current Cinematic
      </div>

      {!showIntro && !showShowroom ? (
        <div className="prototype-demo-idle">
          <p>Intro complete.</p>
          <button className="button" onClick={replay} type="button">
            Replay sequence
          </button>
        </div>
      ) : null}

      {showIntro ? (
        <LuxuryIntro
          key={runId}
          companyName={companyName}
          logoImageUrl={logoImageUrl}
          onEnter={() => {
            setShowIntro(false);
            setShowShowroom(true);
          }}
          onRevealShowroom={() => setShowShowroom(true)}
          settings={settings}
          tagline={tagline}
        />
      ) : null}

      {showShowroom && !showIntro ? <PrototypeShowroomMock variant="cinematic" /> : null}

      <PrototypeTimingHud
        autoEnterMs={AUTO_ENTER_MS}
        ctaMs={PHASE_START_MS.enter}
        label="Current cinematic (code timings)"
      />

      {showIntro ? (
        <button className="prototype-replay-fab" onClick={replay} type="button">
          Replay
        </button>
      ) : null}
    </div>
  );
}

function PrototypeTimingHud({
  label,
  ctaMs,
  autoEnterMs
}: {
  label: string;
  ctaMs: number;
  autoEnterMs: number;
}) {
  return (
    <aside className="prototype-timing-hud">
      <strong>{label}</strong>
      <span>CTA at {(ctaMs / 1000).toFixed(1)}s</span>
      <span>Auto-enter +{(autoEnterMs / 1000).toFixed(1)}s</span>
      <span>Total ~{((ctaMs + autoEnterMs) / 1000).toFixed(1)}s if no click</span>
    </aside>
  );
}
