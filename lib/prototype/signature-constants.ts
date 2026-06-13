export type SignaturePhase =
  | "paper"
  | "sketch"
  | "rise"
  | "interior"
  | "exterior"
  | "logo"
  | "enter";

export const SIGNATURE_PHASE_START_MS: Record<SignaturePhase, number> = {
  paper: 0,
  sketch: 650,
  rise: 3200,
  interior: 5200,
  exterior: 7200,
  logo: 9400,
  enter: 10800
};

export const SIGNATURE_PHASE_ORDER: SignaturePhase[] = [
  "paper",
  "sketch",
  "rise",
  "interior",
  "exterior",
  "logo",
  "enter"
];

export function signaturePhaseAtElapsed(elapsed: number): SignaturePhase {
  let current: SignaturePhase = "paper";
  for (const phase of SIGNATURE_PHASE_ORDER) {
    if (elapsed >= SIGNATURE_PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

/** Measured from constants — not runtime-verified on devices. */
export const SIGNATURE_DURATION_MS = {
  ctaVisible: SIGNATURE_PHASE_START_MS.enter,
  recommendedMin: 8000,
  recommendedMax: 12000
};
