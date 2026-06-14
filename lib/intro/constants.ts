/** localStorage key — bump version when intro sequence changes materially. */
export const INTRO_STORAGE_KEY = "ol-intro-v2-complete";

export type IntroPhase =
  | "dark"
  | "blueprint"
  | "draw"
  | "structure"
  | "interior"
  | "masterpiece"
  | "brand"
  | "enter";

/** Phase start times (ms from mount). Total cinematic arc ≈ 10.2s before CTA. */
export const PHASE_START_MS: Record<IntroPhase, number> = {
  dark: 0,
  blueprint: 350,
  draw: 1100,
  structure: 3400,
  interior: 5400,
  masterpiece: 7400,
  brand: 9200,
  enter: 10400
};

/** Auto-enter showroom after CTA visible (ms). */
export const AUTO_ENTER_MS = 2000;

export const INTRO_PHASE_ORDER: IntroPhase[] = [
  "dark",
  "blueprint",
  "draw",
  "structure",
  "interior",
  "masterpiece",
  "brand",
  "enter"
];

export const SERVICE_LINES = ["Architecture", "Interior Design", "Furniture"] as const;
