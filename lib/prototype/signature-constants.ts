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
  rise: 3000,
  interior: 5400,
  exterior: 7600,
  logo: 9800,
  enter: 11200
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
