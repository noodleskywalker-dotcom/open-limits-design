export type FilmGradePhase =
  | "idea"
  | "blueprint"
  | "structure"
  | "interior"
  | "exterior"
  | "logo"
  | "enter";

export const FILM_GRADE_PHASE_START_MS: Record<FilmGradePhase, number> = {
  idea: 0,
  blueprint: 1000,
  structure: 2700,
  interior: 4500,
  exterior: 7000,
  logo: 9500,
  enter: 11000
};

export const FILM_GRADE_PHASE_ORDER: FilmGradePhase[] = [
  "idea",
  "blueprint",
  "structure",
  "interior",
  "exterior",
  "logo",
  "enter"
];

export const FILM_GRADE_DURATION_MS = {
  ctaVisible: FILM_GRADE_PHASE_START_MS.enter,
  total: 13000
};

export const FILM_GRADE_STORAGE_KEY = "ol-film-grade-dismissed";

export type FilmClipDef = {
  id: string;
  phase: FilmGradePhase;
  video: string;
  poster: string;
  /** Legacy/CMS fallback when poster file missing */
  fallbackImage: string;
};

export const FILM_CLIPS: FilmClipDef[] = [
  {
    id: "structure",
    phase: "structure",
    video: "/intro-film/structure-rise.webm",
    poster: "/intro-film/poster-structure.jpg",
    fallbackImage: "/images/legacy/architecture-showroom-01.jpeg"
  },
  {
    id: "interior",
    phase: "interior",
    video: "/intro-film/interior-walkthrough.webm",
    poster: "/intro-film/poster-interior.jpg",
    fallbackImage: "/images/legacy/hero-luxury-interior-01.jpeg"
  },
  {
    id: "exterior",
    phase: "exterior",
    video: "/intro-film/exterior-villa-reveal.webm",
    poster: "/intro-film/poster-exterior.jpg",
    fallbackImage: "/images/legacy/architecture-showroom-02.jpeg"
  }
];

export function filmGradePhaseAtElapsed(elapsed: number): FilmGradePhase {
  let current: FilmGradePhase = "idea";
  for (const phase of FILM_GRADE_PHASE_ORDER) {
    if (elapsed >= FILM_GRADE_PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

export function filmPhaseAtOrAfter(current: FilmGradePhase, target: FilmGradePhase): boolean {
  return FILM_GRADE_PHASE_ORDER.indexOf(current) >= FILM_GRADE_PHASE_ORDER.indexOf(target);
}

export function filmPhaseBefore(current: FilmGradePhase, target: FilmGradePhase): boolean {
  return FILM_GRADE_PHASE_ORDER.indexOf(current) < FILM_GRADE_PHASE_ORDER.indexOf(target);
}

export function clipForPhase(phase: FilmGradePhase): FilmClipDef | undefined {
  return FILM_CLIPS.find((c) => c.phase === phase);
}

/** Phases that show full-bleed media (not blueprint-only). */
export const MEDIA_PHASES: FilmGradePhase[] = ["structure", "interior", "exterior"];
