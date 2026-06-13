export type CinematicFilmPhase =
  | "idea"
  | "blueprint"
  | "structure"
  | "materials"
  | "walkthrough"
  | "exterior"
  | "brand"
  | "enter";

/** Luxury launch-film arc — ~12s to CTA. */
export const CINEMATIC_FILM_PHASE_START_MS: Record<CinematicFilmPhase, number> = {
  idea: 0,
  blueprint: 1500,
  structure: 3500,
  materials: 5500,
  walkthrough: 7200,
  exterior: 9000,
  brand: 10800,
  enter: 12000
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
  total: 13500
};

export function phaseAtOrAfter(current: CinematicFilmPhase, target: CinematicFilmPhase): boolean {
  return (
    CINEMATIC_FILM_PHASE_ORDER.indexOf(current) >= CINEMATIC_FILM_PHASE_ORDER.indexOf(target)
  );
}
