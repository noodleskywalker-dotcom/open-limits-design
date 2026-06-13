"use client";

import { useCallback, useState } from "react";
import SignatureOpenLimitsIntro from "@/components/prototype/SignatureOpenLimitsIntro";
import PrototypeShowroomMock from "@/components/prototype/PrototypeShowroomMock";
import type { IntroSettings } from "@/lib/cms/types";
import { PREMIUM_PHASE_START_MS } from "@/lib/prototype/premium-constants";

type PrototypePremiumDemoProps = {
  companyName: string;
  logoImageUrl: string | null;
  tagline: string;
  finalRenderUrl?: string | null;
  introSettings?: IntroSettings;
};

export default function PrototypePremiumDemo({
  companyName,
  logoImageUrl,
  tagline,
  finalRenderUrl,
  introSettings
}: PrototypePremiumDemoProps) {
  const [runId, setRunId] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showShowroom, setShowShowroom] = useState(false);

  const replay = useCallback(() => {
    setShowIntro(true);
    setShowShowroom(false);
    setRunId((id) => id + 1);
  }, []);

  return (
    <div className="prototype-demo-shell">
      <div aria-hidden className="prototype-demo-badge prototype-demo-badge-premium">
        Premium hybrid · Signature + Cinematic
      </div>

      {showIntro ? (
        <SignatureOpenLimitsIntro
          key={runId}
          companyName={companyName}
          ctaMs={PREMIUM_PHASE_START_MS.enter}
          detailedBlueprint
          finalRenderUrl={finalRenderUrl}
          headline={introSettings?.introTitle ?? "Design Without Limits"}
          logoImageUrl={logoImageUrl}
          onEnter={() => {
            setShowIntro(false);
            setShowShowroom(true);
          }}
          subtitle={introSettings?.introSubtitle ?? tagline}
          timingLabel="Premium hybrid (code timings)"
          variant="premium"
        />
      ) : null}

      {showShowroom && !showIntro ? <PrototypeShowroomMock variant="premium" /> : null}

      <button className="prototype-replay-fab" onClick={replay} type="button">
        Replay
      </button>
    </div>
  );
}
