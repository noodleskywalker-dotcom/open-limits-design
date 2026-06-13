"use client";

import { useCallback, useState } from "react";
import FilmGradeIntro from "@/components/prototype/film-grade/FilmGradeIntro";
import PrototypeShowroomMock from "@/components/prototype/PrototypeShowroomMock";

type PrototypeFilmGradeDemoProps = {
  companyName: string;
  logoImageUrl: string | null;
  tagline: string;
  finalRenderUrl?: string | null;
  debug?: boolean;
};

export default function PrototypeFilmGradeDemo({
  companyName,
  logoImageUrl,
  tagline,
  finalRenderUrl,
  debug = false
}: PrototypeFilmGradeDemoProps) {
  const [runId, setRunId] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showShowroom, setShowShowroom] = useState(false);

  const replay = useCallback(() => {
    setShowIntro(true);
    setShowShowroom(false);
    setRunId((id) => id + 1);
  }, []);

  return (
    <div className="prototype-demo-shell olfg-demo-shell">
      {showIntro ? (
        <FilmGradeIntro
          key={runId}
          companyName={companyName}
          debug={debug}
          finalRenderUrl={finalRenderUrl}
          logoImageUrl={logoImageUrl}
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
