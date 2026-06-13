export type ClientFilmPhase =
  | "idea"
  | "blueprint"
  | "structure"
  | "interior"
  | "exterior"
  | "logo"
  | "enter";

export const CLIENT_FILM_PHASE_START_MS: Record<ClientFilmPhase, number> = {
  idea: 0,
  blueprint: 1000,
  structure: 2700,
  interior: 4500,
  exterior: 7000,
  logo: 9500,
  enter: 11000
};

export const CLIENT_FILM_PHASE_ORDER: ClientFilmPhase[] = [
  "idea",
  "blueprint",
  "structure",
  "interior",
  "exterior",
  "logo",
  "enter"
];

export const CLIENT_FILM_DURATION_MS = {
  ctaVisible: CLIENT_FILM_PHASE_START_MS.enter,
  total: 13000
};

export const CLIENT_FILM_STORAGE_KEY = "ol-client-film-dismissed";

/** Blueprint overlay begins fading after this mark (ms). */
export const CLIENT_FILM_BLUEPRINT_FADE_MS = 2500;

export type ClientFilmClipDef = {
  id: string;
  phase: ClientFilmPhase;
  video: string;
  poster: string;
  fallbackImage: string;
};

export const CLIENT_FILM_CLIPS: ClientFilmClipDef[] = [
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
    fallbackImage: "/images/legacy/hero-luxury-interior-02.jpeg"
  },
  {
    id: "exterior",
    phase: "exterior",
    video: "/intro-film/exterior-villa-reveal.webm",
    poster: "/intro-film/poster-exterior.jpg",
    fallbackImage: ""
  }
];

export function clientFilmPhaseAtElapsed(elapsed: number): ClientFilmPhase {
  let current: ClientFilmPhase = "idea";
  for (const phase of CLIENT_FILM_PHASE_ORDER) {
    if (elapsed >= CLIENT_FILM_PHASE_START_MS[phase]) current = phase;
  }
  return current;
}

export function clientPhaseAtOrAfter(current: ClientFilmPhase, target: ClientFilmPhase): boolean {
  return (
    CLIENT_FILM_PHASE_ORDER.indexOf(current) >= CLIENT_FILM_PHASE_ORDER.indexOf(target)
  );
}

export function clientClipForPhase(phase: ClientFilmPhase): ClientFilmClipDef | undefined {
  return CLIENT_FILM_CLIPS.find((c) => c.phase === phase);
}

export const CLIENT_MEDIA_PHASES: ClientFilmPhase[] = ["structure", "interior", "exterior"];
