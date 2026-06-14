/**
 * Static analysis metrics for prototype comparison.
 * Bundle sizes populated by scripts/measure-prototype-bundles.mjs after build.
 * Runtime performance NOT measured here — mark UNVERIFIED in UI.
 */

export type PrototypeMetrics = {
  id: "cinematic" | "signature";
  label: string;
  route: string;
  /** Code-defined ms to CTA visible */
  durationToCtaMs: number;
  /** Code-defined ms to auto-complete (0 if manual only) */
  autoEnterMs: number;
  phaseCount: number;
  animationLayerCount: number;
  framerMotionPaths: number;
  svgPathAnimations: number;
  cssKeyframeGroups: number;
  estimatedImplementationDays: string;
  mobilePerformanceEstimate: "low" | "medium" | "high" | "unknown";
  implementationDifficulty: "moderate" | "high" | "very-high";
  bundleKbFirstLoad: number | null;
  bundleKbClient: number | null;
};

export const CINEMATIC_METRICS: PrototypeMetrics = {
  id: "cinematic",
  label: "Current Cinematic (PR #9)",
  route: "/prototype/current-cinematic",
  durationToCtaMs: 10400,
  autoEnterMs: 2000,
  phaseCount: 8,
  animationLayerCount: 4,
  framerMotionPaths: 3,
  svgPathAnimations: 1,
  cssKeyframeGroups: 12,
  estimatedImplementationDays: "3–5 (already built on PR #9 branch)",
  mobilePerformanceEstimate: "medium",
  implementationDifficulty: "moderate",
  bundleKbFirstLoad: null,
  bundleKbClient: null
};

export const SIGNATURE_METRICS: PrototypeMetrics = {
  id: "signature",
  label: "Signature Open Limits (original vision)",
  route: "/prototype/signature-open-limits",
  durationToCtaMs: 10800,
  autoEnterMs: 0,
  phaseCount: 7,
  animationLayerCount: 6,
  framerMotionPaths: 4,
  svgPathAnimations: 2,
  cssKeyframeGroups: 8,
  estimatedImplementationDays: "8–14 for production polish (morph fidelity, QA, devices)",
  mobilePerformanceEstimate: "medium",
  implementationDifficulty: "very-high",
  bundleKbFirstLoad: null,
  bundleKbClient: null
};

export type ComparisonRow = {
  dimension: string;
  cinematic: string;
  signature: string;
  winner: "cinematic" | "signature" | "tie" | "unverified";
};

export const COMPARISON_TABLE: ComparisonRow[] = [
  {
    dimension: "Total duration to CTA (code)",
    cinematic: "~10.4s",
    signature: "~10.8s",
    winner: "tie"
  },
  {
    dimension: "Auto-enter after CTA",
    cinematic: "Yes (+2s)",
    signature: "No — click only",
    winner: "signature"
  },
  {
    dimension: "Blueprint → structure transition",
    cinematic: "Separate CSS layer fade",
    signature: "Extrude from same SVG footprint",
    winner: "signature"
  },
  {
    dimension: "Interior camera move",
    cinematic: "Scale/translate on canvas",
    signature: "Dedicated camera wrapper + interior world",
    winner: "signature"
  },
  {
    dimension: "Logo from architecture lines",
    cinematic: "Separate brand panel fade-in",
    signature: "Scene collapse + line morph logo",
    winner: "signature"
  },
  {
    dimension: "Emotional storytelling",
    cinematic: "Technical demonstration",
    signature: "Storyboard-driven narrative",
    winner: "signature"
  },
  {
    dimension: "Implementation risk",
    cinematic: "Lower — already on PR #9",
    signature: "Higher — morph/camera fidelity",
    winner: "cinematic"
  },
  {
    dimension: "Mobile performance (estimated)",
    cinematic: "Medium load",
    signature: "Medium–high load",
    winner: "unverified"
  },
  {
    dimension: "Bundle size (post-build)",
    cinematic: "See measure script",
    signature: "See measure script",
    winner: "unverified"
  }
];

export const CINEMATIC_PROS = [
  "Already implemented — closest to shippable on PR #9",
  "Clear phase timing via requestAnimationFrame",
  "Detailed SVG villa plan with dimensions and elevation",
  "Optional CMS final render overlay on exterior",
  "Auto-enter reduces friction for repeat showroom access"
];

export const CINEMATIC_CONS = [
  "Structure/interior/exterior are layered crossfades — not a continuous morph",
  "Can read as animated presentation rather than emotional story",
  "Auto-enter may feel pushy for a luxury brand",
  "Blueprint CMS field unused in current implementation"
];

export const SIGNATURE_PROS = [
  "Follows original storyboard phases (paper → sketch → rise → interior → hero → logo)",
  "Walls extrude from blueprint footprint — closer to 'drawing becomes architecture'",
  "Camera move through interior world",
  "Villa dissolves before logo construction",
  "Minimal Phase 7 — single Enter button, no clutter"
];

export const SIGNATURE_CONS = [
  "Prototype fidelity still below film-grade — CSS/SVG approximations",
  "Higher engineering cost to reach true morph continuity",
  "No device FPS profiling yet",
  "No recorded video/GIF assets for stakeholder review"
];

export const RECOMMENDATION_NOTE =
  "For a world-class luxury architecture brand, the Signature direction better matches the emotional brief — if willing to invest in polish, device QA, and possible motion-design collaboration. The Current Cinematic path is the lower-risk near-term ship candidate from PR #9.";
