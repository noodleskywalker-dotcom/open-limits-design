"use client";

import { useEffect, useState } from "react";

type HomeIntroProps = {
  ceoName: string;
  ceoImageUrl: string | null;
  companyName: string;
};

export default function HomeIntro({ ceoName, ceoImageUrl, companyName }: HomeIntroProps) {
  const [visible, setVisible] = useState(Boolean(ceoImageUrl));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!ceoImageUrl) return;

    const fadeTimer = window.setTimeout(() => setFading(true), 2600);
    const hideTimer = window.setTimeout(() => setVisible(false), 3400);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [ceoImageUrl]);

  if (!visible || !ceoImageUrl) return null;

  return (
    <div aria-hidden={fading} className={`home-intro ${fading ? "home-intro-fade" : ""}`}>
      <div className="home-intro-inner">
        {ceoImageUrl ? (
          <img alt={ceoName} className="home-intro-portrait" src={ceoImageUrl} />
        ) : null}
        <p className="home-intro-eyebrow">{companyName}</p>
        <h2 className="home-intro-title">{ceoName}</h2>
        <p className="home-intro-tagline">Design Without Limits</p>
      </div>
    </div>
  );
}
