export type PremiumV2Phase =
  | "pencil"
  | "blueprint"
  | "rise"
  | "materials"
  | "walkthrough"
  | "exterior"
  | "collapse"
  | "morph"
  | "enter";

/** Launch-film arc — ~12s to CTA, ~13s total comfortable viewing. */
export const PREMIUM_V2_PHASE_START_MS: Record<PremiumV2Phase, number> = {
  pencil: 0,
  blueprint: 1400,
  rise: 3000,
  materials: 4600,
  walkthrough: 6200,
  exterior: 8400,
  collapse: 10200,
  morph: 11000,
  enter: 12000
};

export const PREMIUM_V2_PHASE_ORDER: PremiumV2Phase[] = [
  "pencil",
  "blueprint",
  "rise",
  "materials",
  "walkthrough",
  "exterior",
  "collapse",
  "morph",
  "enter"
];

export function premiumV2PhaseAtElapsed(elapsed: number): PremiumV2Phase {
  let current: PremiumV2Phase = "pencil";
  for (const phase of PREMIUM_V2_PHASE_ORDER) {
    if (elapsed >= PREMIUM_V2_PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

export const PREMIUM_V2_DURATION_MS = {
  ctaVisible: PREMIUM_V2_PHASE_START_MS.enter,
  recommendedMin: 11000,
  recommendedMax: 14000
};

/** Phases where atmospheric light beams + dust are visible. */
export const PREMIUM_V2_ATMOSPHERE_PHASES: PremiumV2Phase[] = [
  "walkthrough",
  "exterior",
  "collapse"
];

export function phaseShowsAtmosphere(phase: PremiumV2Phase): boolean {
  return PREMIUM_V2_ATMOSPHERE_PHASES.includes(phase);
}
