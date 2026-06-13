"use client";

import { useCallback, useState } from "react";
import CreationIntro from "@/components/prototype/creation/CreationIntro";
import PrototypeShowroomMock from "@/components/prototype/PrototypeShowroomMock";

type PrototypeClientFilmDemoProps = {
  companyName: string;
  logoImageUrl?: string | null;
  tagline: string;
  finalRenderUrl?: string | null;
  debug?: boolean;
};

export default function PrototypeClientFilmDemo({
  companyName,
  tagline,
  debug = false
}: PrototypeClientFilmDemoProps) {
  const [runId, setRunId] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showShowroom, setShowShowroom] = useState(false);

  const replay = useCallback(() => {
    setShowIntro(true);
    setShowShowroom(false);
    setRunId((id) => id + 1);
  }, []);

  return (
    <div className="prototype-demo-shell olcrt-demo-shell">
      {showIntro ? (
        <CreationIntro
          key={runId}
          companyName={companyName}
          debug={debug}
          onEnter={() => {
            setShowIntro(false);
            setShowShowroom(true);
          }}
          tagline={tagline}
        />
      ) : null}

      {showShowroom && !showIntro ? (
        <PrototypeShowroomMock variant="premium-v2" />
      ) : null}

      {debug ? (
        <button className="prototype-replay-fab" onClick={replay} type="button">
          Replay
        </button>
      ) : null}
    </div>
  );
}
