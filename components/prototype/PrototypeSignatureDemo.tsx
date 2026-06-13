"use client";

import { useCallback, useState } from "react";
import SignatureOpenLimitsIntro from "@/components/prototype/SignatureOpenLimitsIntro";
import PrototypeShowroomMock from "@/components/prototype/PrototypeShowroomMock";

export default function PrototypeSignatureDemo() {
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
      <div aria-hidden className="prototype-demo-badge">
        Original vision · Signature Open Limits
      </div>

      {showIntro ? (
        <SignatureOpenLimitsIntro
          key={runId}
          onEnter={() => {
            setShowIntro(false);
            setShowShowroom(true);
          }}
        />
      ) : null}

      {showShowroom && !showIntro ? <PrototypeShowroomMock variant="signature" /> : null}

      {showIntro ? (
        <button className="prototype-replay-fab" onClick={replay} type="button">
          Replay
        </button>
      ) : (
        <button className="prototype-replay-fab" onClick={replay} type="button">
          Replay
        </button>
      )}
    </div>
  );
}
