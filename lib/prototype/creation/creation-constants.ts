/** Film beats — emotional structure, not component phases. */

export type FilmBeat = "opening" | "drawing" | "moment" | "architecture" | "identity" | "end";

export const FILM_BEAT_MS: Record<FilmBeat, number> = {
  opening: 0,
  drawing: 1500,
  moment: 4000,
  architecture: 8000,
  identity: 11000,
  end: 13000
};

export const FILM_BEAT_ORDER: FilmBeat[] = [
  "opening",
  "drawing",
  "moment",
  "architecture",
  "identity",
  "end"
];

export const FILM_DURATION_MS = {
  ctaVisible: FILM_BEAT_MS.end,
  total: 16000
};

export const CREATION_STORAGE_KEY = "ol-creation-intro-dismissed";

/** @deprecated Use FilmBeat — kept for debug HUD compatibility */
export type CreationPhase = FilmBeat;

export const CREATION_PHASE_START_MS = FILM_BEAT_MS;
export const CREATION_PHASE_ORDER = FILM_BEAT_ORDER;
export const CREATION_DURATION_MS = FILM_DURATION_MS;

export function filmBeatAtElapsed(elapsed: number): FilmBeat {
  let current: FilmBeat = "opening";
  for (const beat of FILM_BEAT_ORDER) {
    if (elapsed >= FILM_BEAT_MS[beat]) current = beat;
  }
  return current;
}

export function creationPhaseAtElapsed(elapsed: number): FilmBeat {
  return filmBeatAtElapsed(elapsed);
}

export function filmBeatAtOrAfter(current: FilmBeat, target: FilmBeat): boolean {
  return FILM_BEAT_ORDER.indexOf(current) >= FILM_BEAT_ORDER.indexOf(target);
}

export function creationPhaseAtOrAfter(current: FilmBeat, target: FilmBeat): boolean {
  return filmBeatAtOrAfter(current, target);
}

export function beatProgress(
  elapsed: number,
  beat: FilmBeat,
  nextBeat?: FilmBeat
): number {
  const start = FILM_BEAT_MS[beat];
  const end = nextBeat ? FILM_BEAT_MS[nextBeat] : FILM_DURATION_MS.total;
  if (elapsed <= start) return 0;
  if (elapsed >= end) return 1;
  return (elapsed - start) / (end - start);
}

export function phaseProgress(
  elapsed: number,
  beat: FilmBeat,
  nextBeat?: FilmBeat
): number {
  return beatProgress(elapsed, beat, nextBeat);
}
