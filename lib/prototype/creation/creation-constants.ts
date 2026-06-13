export type CreationPhase =
  | "pencil"
  | "blueprint"
  | "transform"
  | "villa"
  | "brand"
  | "enter";

export const CREATION_PHASE_START_MS: Record<CreationPhase, number> = {
  pencil: 0,
  blueprint: 2600,
  transform: 8200,
  villa: 13200,
  brand: 17200,
  enter: 20200
};

export const CREATION_PHASE_ORDER: CreationPhase[] = [
  "pencil",
  "blueprint",
  "transform",
  "villa",
  "brand",
  "enter"
];

export const CREATION_DURATION_MS = {
  ctaVisible: CREATION_PHASE_START_MS.enter,
  total: 23000
};

export const CREATION_STORAGE_KEY = "ol-creation-intro-dismissed";

export function creationPhaseAtElapsed(elapsed: number): CreationPhase {
  let current: CreationPhase = "pencil";
  for (const phase of CREATION_PHASE_ORDER) {
    if (elapsed >= CREATION_PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

export function creationPhaseAtOrAfter(current: CreationPhase, target: CreationPhase): boolean {
  return CREATION_PHASE_ORDER.indexOf(current) >= CREATION_PHASE_ORDER.indexOf(target);
}

export function phaseProgress(
  elapsed: number,
  phase: CreationPhase,
  nextPhase?: CreationPhase
): number {
  const start = CREATION_PHASE_START_MS[phase];
  const end = nextPhase ? CREATION_PHASE_START_MS[nextPhase] : CREATION_DURATION_MS.total;
  if (elapsed <= start) return 0;
  if (elapsed >= end) return 1;
  return (elapsed - start) / (end - start);
}
