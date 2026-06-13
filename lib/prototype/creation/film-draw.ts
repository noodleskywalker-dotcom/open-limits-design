import { beatProgress } from "@/lib/prototype/creation/creation-constants";
import {
  DRAW_SEQUENCE,
  ELEMENT_BY_ID,
  type DrawSegment,
  type VillaElement
} from "@/lib/prototype/creation/villa-geometry";

export type SegmentDrawState = {
  segmentId: string;
  elementId: string;
  /** 0–1 how much of this segment is revealed */
  reveal: number;
  /** Current opacity on blueprint plane */
  opacity: number;
  /** Lift off plane during extrusion */
  lift: number;
};

export type PencilState = {
  x: number;
  y: number;
  visible: boolean;
  pressure: number;
};

export type ElementExtrudeState = {
  elementId: string;
  progress: number;
};

function segLength(seg: DrawSegment): number {
  const dx = seg.to[0] - seg.from[0];
  const dy = seg.to[1] - seg.from[1];
  return Math.hypot(dx, dy);
}

const SEGMENT_LENGTHS = DRAW_SEQUENCE.map(segLength);
const TOTAL_DRAW_LENGTH = SEGMENT_LENGTHS.reduce((a, b) => a + b, 0);

/** Physical pencil draw — distance-based, not pathLength CSS. */
export function pencilState(elapsed: number): PencilState {
  const drawT = beatProgress(elapsed, "drawing", "moment");
  if (drawT <= 0) return { x: 600, y: 520, visible: false, pressure: 0 };
  if (drawT >= 1) return { x: 0, y: 0, visible: false, pressure: 0 };

  const dist = drawT * TOTAL_DRAW_LENGTH;
  let acc = 0;
  for (let i = 0; i < DRAW_SEQUENCE.length; i++) {
    const len = SEGMENT_LENGTHS[i];
    if (acc + len >= dist) {
      const local = (dist - acc) / len;
      const seg = DRAW_SEQUENCE[i];
      return {
        x: seg.from[0] + (seg.to[0] - seg.from[0]) * local,
        y: seg.from[1] + (seg.to[1] - seg.from[1]) * local,
        visible: true,
        pressure: 0.85 + Math.sin(local * Math.PI) * 0.15
      };
    }
    acc += len;
  }
  const last = DRAW_SEQUENCE[DRAW_SEQUENCE.length - 1];
  return { x: last.to[0], y: last.to[1], visible: true, pressure: 0.5 };
}

export function segmentDrawStates(elapsed: number): SegmentDrawState[] {
  const drawT = beatProgress(elapsed, "drawing", "moment");
  const momentT = beatProgress(elapsed, "moment", "architecture");
  const drawDist = Math.min(1, drawT) * TOTAL_DRAW_LENGTH;

  let acc = 0;
  const states: SegmentDrawState[] = [];

  for (let i = 0; i < DRAW_SEQUENCE.length; i++) {
    const seg = DRAW_SEQUENCE[i];
    const len = SEGMENT_LENGTHS[i];
    const el = ELEMENT_BY_ID[seg.elementId];
    const extrude = el?.solid ? elementExtrudeProgress(momentT, el) : 0;

    let reveal = 0;
    if (drawDist >= acc + len) reveal = 1;
    else if (drawDist > acc) reveal = (drawDist - acc) / len;

    let opacity = 1;
    let lift = 0;
    if (el?.solid && momentT > 0) {
      const fade = Math.max(0, (extrude - 0.12) / 0.88);
      opacity = Math.max(0, 1 - fade * 1.05);
      lift = fade * 22;
    } else if (el?.category === "reference" && momentT > 0.15) {
      opacity = Math.max(0, 1 - momentT * 1.8);
    }

    states.push({
      segmentId: seg.id,
      elementId: seg.elementId,
      reveal,
      opacity,
      lift
    });
    acc += len;
  }
  return states;
}

export function elementExtrudeProgress(momentT: number, el: VillaElement): number {
  if (!el.solid) return 0;
  const structures = Object.values(ELEMENT_BY_ID).filter((e) => e.solid);
  const maxOrder = structures.length - 1;
  const start = (el.order / maxOrder) * 0.55;
  const span = 0.48;
  if (momentT <= start) return 0;
  if (momentT >= start + span) return 1;
  const t = (momentT - start) / span;
  return 1 - (1 - t) ** 3;
}

export function allExtrudeStates(momentT: number): ElementExtrudeState[] {
  return Object.values(ELEMENT_BY_ID)
    .filter((e) => e.solid)
    .map((el) => ({
      elementId: el.id,
      progress: elementExtrudeProgress(momentT, el)
    }));
}
