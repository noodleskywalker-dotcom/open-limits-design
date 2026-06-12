"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IntroSettings, IntroSlide } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";

const INTRO_KEY = "old-intro-seen";

type LuxuryIntroProps = {
  slides: IntroSlide[];
  ceoImageUrl: string | null;
  logoImageUrl: string | null;
  companyName: string;
  ceoName: string;
  tagline: string;
  settings: IntroSettings;
};

export default function LuxuryIntro({
  slides,
  ceoImageUrl,
  logoImageUrl,
  companyName,
  ceoName,
  tagline,
  settings
}: LuxuryIntroProps) {
  const [visible, setVisible] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const allSlides = useMemo(() => {
    const built: { image: string; title: string; subtitle: string }[] = [];

    if (logoImageUrl) {
      built.push({
        image: logoImageUrl,
        title: settings.introTitle ?? companyName,
        subtitle: settings.introSubtitle ?? "Luxury Design Studio"
      });
    } else {
      built.push({
        image: "",
        title: settings.introTitle ?? companyName,
        subtitle: settings.introSubtitle ?? "OPEN LIMITS DESIGN"
      });
    }

    if (ceoImageUrl) {
      built.push({ image: ceoImageUrl, title: ceoName, subtitle: tagline });
    }

    for (const slide of slides) {
      const url = resolveImageUrl(slide.media);
      if (url) {
        built.push({
          image: url,
          title: slide.title ?? companyName,
          subtitle: slide.subtitle ?? tagline
        });
      }
    }

    return built.length ? built : [{ image: "", title: settings.introTitle ?? companyName, subtitle: tagline }];
  }, [slides, ceoImageUrl, logoImageUrl, companyName, ceoName, tagline, settings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!settings.enabled || sessionStorage.getItem(INTRO_KEY) === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first-visit intro must read sessionStorage client-side
    setVisible(true);
  }, [settings.enabled]);

  useEffect(() => {
    if (!visible || allSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % allSlides.length);
    }, settings.autoplayMs);
    return () => window.clearInterval(timer);
  }, [visible, allSlides.length, settings.autoplayMs]);

  const enter = useCallback(() => {
    setExiting(true);
    sessionStorage.setItem(INTRO_KEY, "1");
    window.setTimeout(() => setVisible(false), 700);
  }, []);

  if (!visible) return null;

  const current = allSlides[slideIndex];

  return (
    <div aria-modal="true" className={`luxury-intro ${exiting ? "luxury-intro-exit" : ""}`} role="dialog">
      <div className="luxury-intro-backdrop" />
      <div className="luxury-intro-content">
        <div className="luxury-intro-slide" key={slideIndex}>
          {current.image ? (
            <img alt={current.title} className="luxury-intro-image" src={current.image} />
          ) : (
            <div className="luxury-intro-logo-text">
              <span className="logo-animated">OPEN LIMITS</span>
              <span className="logo-animated delay">DESIGN</span>
            </div>
          )}
          <div className="luxury-intro-copy">
            <p className="eyebrow">{current.subtitle}</p>
            <h1>{current.title}</h1>
          </div>
        </div>

        <div className="luxury-intro-dots">
          {allSlides.map((_, index) => (
            <button
              aria-label={`Slide ${index + 1}`}
              className={index === slideIndex ? "active" : ""}
              key={index}
              onClick={() => setSlideIndex(index)}
              type="button"
            />
          ))}
        </div>

        <div className="luxury-intro-actions">
          <button className="button" onClick={enter} type="button">
            Enter Website
          </button>
          <button className="button ghost" onClick={enter} type="button">
            Skip Intro
          </button>
        </div>
      </div>
    </div>
  );
}
