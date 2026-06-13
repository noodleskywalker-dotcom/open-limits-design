"use client";

import { useCallback, useState } from "react";
import PremiumFilmIntro from "@/components/prototype/premium-v2/PremiumFilmIntro";
import PrototypeShowroomMock from "@/components/prototype/PrototypeShowroomMock";

type PrototypePremiumV2DemoProps = {
  companyName: string;
  logoImageUrl: string | null;
  tagline: string;
  finalRenderUrl?: string | null;
};

export default function PrototypePremiumV2Demo({
  companyName,
  logoImageUrl,
  tagline,
  finalRenderUrl
}: PrototypePremiumV2DemoProps) {
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
        Premium v2 · Launch film
      </div>

      {showIntro ? (
        <PremiumFilmIntro
          key={runId}
          companyName={companyName}
          finalRenderUrl={finalRenderUrl}
          logoImageUrl={logoImageUrl}
          onEnter={() => {
            setShowIntro(false);
            setShowShowroom(true);
          }}
          subtitle={tagline}
        />
      ) : null}

      {showShowroom && !showIntro ? <PrototypeShowroomMock variant="premium-v2" /> : null}

      <button className="prototype-replay-fab" onClick={replay} type="button">
        Replay
      </button>
    </div>
  );
}
