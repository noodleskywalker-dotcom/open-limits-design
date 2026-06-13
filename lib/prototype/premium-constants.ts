export type PremiumPhase =
  | "paper"
  | "sketch"
  | "rise"
  | "interior"
  | "exterior"
  | "logo"
  | "enter";

/** Premium hybrid — signature storytelling + cinematic polish (+0.4s per major beat). */
export const PREMIUM_PHASE_START_MS: Record<PremiumPhase, number> = {
  paper: 0,
  sketch: 700,
  rise: 3400,
  interior: 5600,
  exterior: 7800,
  logo: 10000,
  enter: 11400
};

export const PREMIUM_PHASE_ORDER: PremiumPhase[] = [
  "paper",
  "sketch",
  "rise",
  "interior",
  "exterior",
  "logo",
  "enter"
];

export function premiumPhaseAtElapsed(elapsed: number): PremiumPhase {
  let current: PremiumPhase = "paper";
  for (const phase of PREMIUM_PHASE_ORDER) {
    if (elapsed >= PREMIUM_PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

export const PREMIUM_DURATION_MS = {
  ctaVisible: PREMIUM_PHASE_START_MS.enter,
  recommendedMin: 9000,
  recommendedMax: 13000
};
