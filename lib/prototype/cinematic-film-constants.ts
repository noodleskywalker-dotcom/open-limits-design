export type CinematicFilmPhase =
  | "idea"
  | "blueprint"
  | "structure"
  | "materials"
  | "walkthrough"
  | "exterior"
  | "brand"
  | "enter";

/** Emotional arc pacing — building admired longer than drawing. Exterior = hero (3s). */
export const CINEMATIC_FILM_PHASE_START_MS: Record<CinematicFilmPhase, number> = {
  idea: 0,
  blueprint: 1000,
  structure: 3000,
  materials: 5000,
  walkthrough: 7000,
  exterior: 9500,
  brand: 12500,
  enter: 14000
};

/** Emotional labels (debug / documentation — not shown in UI). */
export const CINEMATIC_FILM_EMOTIONAL_ARC: Record<CinematicFilmPhase, string> = {
  idea: "Dream",
  blueprint: "Design",
  structure: "Creation",
  materials: "Craftsmanship",
  walkthrough: "Luxury",
  exterior: "Masterpiece",
  brand: "Identity",
  enter: "Enter"
};

export const CINEMATIC_FILM_PHASE_ORDER: CinematicFilmPhase[] = [
  "idea",
  "blueprint",
  "structure",
  "materials",
  "walkthrough",
  "exterior",
  "brand",
  "enter"
];

export function cinematicFilmPhaseAtElapsed(elapsed: number): CinematicFilmPhase {
  let current: CinematicFilmPhase = "idea";
  for (const phase of CINEMATIC_FILM_PHASE_ORDER) {
    if (elapsed >= CINEMATIC_FILM_PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

export const CINEMATIC_FILM_STORAGE_KEY = "ol-cinematic-film-dismissed";

export const CINEMATIC_FILM_DURATION_MS = {
  ctaVisible: CINEMATIC_FILM_PHASE_START_MS.enter,
  total: 16000
};

export function phaseAtOrAfter(current: CinematicFilmPhase, target: CinematicFilmPhase): boolean {
  return (
    CINEMATIC_FILM_PHASE_ORDER.indexOf(current) >= CINEMATIC_FILM_PHASE_ORDER.indexOf(target)
  );
}

export function phaseBefore(current: CinematicFilmPhase, target: CinematicFilmPhase): boolean {
  return CINEMATIC_FILM_PHASE_ORDER.indexOf(current) < CINEMATIC_FILM_PHASE_ORDER.indexOf(target);
}
