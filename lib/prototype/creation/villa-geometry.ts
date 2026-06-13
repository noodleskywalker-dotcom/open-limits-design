/** Shared villa blueprint + 3D wall definitions (1200×675 viewBox → world units). */

export const VIEW_W = 1200;
export const VIEW_H = 675;
export const VIEW_CX = 600;
export const VIEW_CY = 340;
export const LOGO_ANCHOR = { x: 600, y: 340 } as const;

export type WallKind = WallDef["kind"];

export type WallDef = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  extrudeHeight: number;
  kind: "living" | "suite" | "pool" | "elevation" | "glass" | "column" | "roof";
  /** Extrusion sequence during transform phase (lower = earlier). */
  order: number;
};

export const VILLA_WALLS: WallDef[] = [
  { id: "living-upper", x: 182, y: 182, width: 196, height: 116, extrudeHeight: 1.1, kind: "living", order: 0 },
  { id: "suite-upper", x: 382, y: 182, width: 236, height: 116, extrudeHeight: 1.1, kind: "suite", order: 1 },
  { id: "col-l", x: 370, y: 200, width: 12, height: 100, extrudeHeight: 1.2, kind: "column", order: 2 },
  { id: "col-r", x: 610, y: 200, width: 12, height: 100, extrudeHeight: 1.2, kind: "column", order: 3 },
  { id: "living-lower", x: 182, y: 302, width: 196, height: 114, extrudeHeight: 0.85, kind: "living", order: 4 },
  { id: "suite-lower", x: 382, y: 302, width: 236, height: 114, extrudeHeight: 0.85, kind: "suite", order: 5 },
  { id: "glass-a", x: 400, y: 320, width: 120, height: 60, extrudeHeight: 0.5, kind: "glass", order: 6 },
  { id: "pool", x: 662, y: 342, width: 156, height: 136, extrudeHeight: 0.35, kind: "pool", order: 7 },
  { id: "glass-b", x: 920, y: 320, width: 160, height: 80, extrudeHeight: 0.55, kind: "glass", order: 8 },
  { id: "elev-main", x: 878, y: 182, width: 242, height: 296, extrudeHeight: 1.35, kind: "elevation", order: 9 },
  { id: "roof-main", x: 180, y: 168, width: 440, height: 8, extrudeHeight: 0.15, kind: "roof", order: 10 }
];

export type BlueprintStrokeVariant = "gold" | "room" | "pool" | "dim" | "divider" | "default";

export type BlueprintStrokeDef = {
  id: string;
  d: string;
  wallIds: string[];
  variant: BlueprintStrokeVariant;
  drawDelay: number;
  /** When true, stroke fades only after all linked walls complete. */
  requiresAll?: boolean;
};

export const BLUEPRINT_STROKES: BlueprintStrokeDef[] = [
  {
    id: "perimeter",
    d: "M178 418 Q179 300 182 182 H618 Q620 300 618 418 H178 Z",
    wallIds: ["living-upper", "suite-upper", "living-lower", "suite-lower"],
    variant: "gold",
    drawDelay: 0,
    requiresAll: true
  },
  {
    id: "divider-v",
    d: "M378 182 Q380 300 382 418",
    wallIds: ["col-l", "col-r"],
    variant: "divider",
    drawDelay: 0.08
  },
  {
    id: "divider-h",
    d: "M182 298 Q400 302 618 300",
    wallIds: ["living-lower", "suite-lower"],
    variant: "divider",
    drawDelay: 0.12,
    requiresAll: true
  },
  {
    id: "living-upper",
    d: "M182 182 H378 Q382 240 378 298 H182 Z",
    wallIds: ["living-upper"],
    variant: "room",
    drawDelay: 0.16
  },
  {
    id: "suite-upper",
    d: "M382 182 H618 Q622 240 618 298 H382 Z",
    wallIds: ["suite-upper"],
    variant: "room",
    drawDelay: 0.2
  },
  {
    id: "living-lower",
    d: "M182 302 H378 V416 H182 Z",
    wallIds: ["living-lower"],
    variant: "room",
    drawDelay: 0.24
  },
  {
    id: "suite-lower",
    d: "M382 302 H618 V416 H382 Z",
    wallIds: ["suite-lower"],
    variant: "room",
    drawDelay: 0.28
  },
  {
    id: "pool",
    d: "M662 342 H818 Q822 410 818 478 H662 Z",
    wallIds: ["pool"],
    variant: "pool",
    drawDelay: 0.32
  },
  {
    id: "elevation",
    d: "M878 478 L882 222 Q960 188 1042 182 L1118 202 L1120 478 Z",
    wallIds: ["elev-main", "glass-b"],
    variant: "gold",
    drawDelay: 0.38
  },
  {
    id: "dim-width",
    d: "M182 542 H618 M182 550 V534 M618 550 V534",
    wallIds: ["living-lower", "suite-lower"],
    variant: "dim",
    drawDelay: 0.48,
    requiresAll: true
  },
  {
    id: "dim-height",
    d: "M138 182 V416 M130 182 H146 M130 416 H146",
    wallIds: ["living-upper", "living-lower"],
    variant: "dim",
    drawDelay: 0.52,
    requiresAll: true
  },
  {
    id: "north",
    d: "M1048 558 L1048 522 M1028 542 L1048 522 L1068 542",
    wallIds: ["roof-main"],
    variant: "gold",
    drawDelay: 0.56
  }
];

export type MorphLineDef = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Which wall corner/edge this line originates from. */
  wallId: string;
};

/** Edge lines radiating from villa geometry toward logo anchor — brand morph source. */
export const VILLA_MORPH_LINES: MorphLineDef[] = [
  { wallId: "living-upper", x1: 182, y1: 182, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "living-upper", x1: 378, y1: 182, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "suite-upper", x1: 618, y1: 182, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "living-lower", x1: 182, y1: 416, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "suite-lower", x1: 618, y1: 416, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "pool", x1: 818, y1: 478, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "elev-main", x1: 1118, y1: 202, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "elev-main", x1: 878, y1: 478, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "roof-main", x1: 400, y1: 168, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y },
  { wallId: "roof-main", x1: 820, y1: 168, x2: LOGO_ANCHOR.x, y2: LOGO_ANCHOR.y }
];

export const LOGO_PATHS = {
  goldLine: { x1: 280, y1: 340, x2: 920, y2: 340 },
  frame: "M380 372 H820 V308 H380 Z",
  frameLeg: "M380 372 V398 H580",
  accent: "M420 340 H780"
} as const;

const WALL_BY_ID = Object.fromEntries(VILLA_WALLS.map((w) => [w.id, w])) as Record<string, WallDef>;
const ORDER_COUNT = VILLA_WALLS.length;
const STAGGER = 0.075;

export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Per-wall extrusion progress during transform phase (0–1). */
export function wallExtrudeProgress(transformT: number, wallId: string): number {
  const wall = WALL_BY_ID[wallId];
  if (!wall) return 0;
  const start = wall.order * STAGGER;
  const span = 1 - (ORDER_COUNT - 1) * STAGGER * 0.55;
  if (transformT <= start) return 0;
  if (transformT >= start + span) return 1;
  return easeOutCubic((transformT - start) / span);
}

export function wallProgressMap(transformT: number): Record<string, number> {
  const map: Record<string, number> = {};
  for (const wall of VILLA_WALLS) {
    map[wall.id] = wallExtrudeProgress(transformT, wall.id);
  }
  return map;
}

export type StrokeVisualState = {
  opacity: number;
  liftY: number;
  warmth: number;
};

/** Blueprint stroke fades and lifts as its linked wall(s) extrude. */
export function strokeVisualState(
  stroke: BlueprintStrokeDef,
  progressMap: Record<string, number>,
  phase: "blueprint" | "transform" | "villa" | string
): StrokeVisualState {
  if (phase === "blueprint") return { opacity: 1, liftY: 0, warmth: 0 };

  const progresses = stroke.wallIds.map((id) => progressMap[id] ?? 0);
  const completion = stroke.requiresAll
    ? Math.min(...progresses)
    : Math.max(...progresses);

  const fadeStart = 0.35;
  const fadeT = Math.max(0, (completion - fadeStart) / (1 - fadeStart));
  const opacity = phase === "villa" ? Math.max(0, 0.08 * (1 - fadeT)) : Math.max(0, 1 - easeOutCubic(fadeT) * 0.98);
  const liftY = easeOutCubic(completion) * 18;
  const warmth = easeOutCubic(completion);

  return { opacity, liftY, warmth };
}

export function strokeColor(warmth: number, variant: BlueprintStrokeVariant): string {
  const w = warmth;
  switch (variant) {
    case "gold":
      return `rgb(${Math.round(120 + 80 * w)} ${Math.round(185 - 23 * w)} ${Math.round(240 - 166 * w)} / ${(0.55 + w * 0.4).toFixed(2)})`;
    case "pool":
      return `rgb(${Math.round(90 + 16 * w)} ${Math.round(200 - 46 * w)} ${Math.round(255 - 71 * w)} / ${(0.68 - w * 0.15).toFixed(2)})`;
    case "dim":
      return `rgb(${Math.round(140 + 60 * w)} ${Math.round(190 + 10 * w)} ${Math.round(235 - 75 * w)} / ${(0.45 + w * 0.2).toFixed(2)})`;
    case "room":
      return `rgb(${Math.round(100 + 140 * w)} ${Math.round(170 + 66 * w)} ${Math.round(235 - 47 * w)} / ${(0.72 + w * 0.2).toFixed(2)})`;
    case "divider":
      return `rgb(${Math.round(120 + 80 * w)} ${Math.round(185 - 23 * w)} ${Math.round(240 - 166 * w)} / ${(0.65 + w * 0.25).toFixed(2)})`;
    default:
      return `rgb(${Math.round(120 + 120 * w)} ${Math.round(185 + 51 * w)} ${Math.round(240 - 54 * w)} / ${(0.82).toFixed(2)})`;
  }
}

/** Shared collapse factor for brand phase — 3D + SVG use identical curve. */
export function brandCollapseT(brandT: number): number {
  return easeOutCubic(brandT);
}

export function morphLineState(line: MorphLineDef, collapseT: number) {
  const anchor = LOGO_ANCHOR;
  const pull = collapseT * 0.92;
  return {
    x1: line.x1 + (anchor.x - line.x1) * pull,
    y1: line.y1 + (anchor.y - line.y1) * pull,
    x2: line.x2 + (anchor.x - line.x2) * pull * 0.15,
    y2: line.y2 + (anchor.y - line.y2) * pull * 0.15,
    opacity: collapseT < 0.08 ? 0.55 + collapseT * 4 : Math.max(0, 0.92 - collapseT * 0.95),
    width: 1.4 + collapseT * 0.6
  };
}

/** Map SVG coords to R3F world (plan XZ plane, Y up). */
export function svgToWorld(sx: number, sy: number): [number, number, number] {
  const x = (sx - VIEW_CX) / 95;
  const z = (sy - 420) / 95;
  return [x, 0, z];
}

export function wallCenter(w: WallDef): [number, number, number] {
  const cx = w.x + w.width / 2;
  const cy = w.y + w.height / 2;
  const [x, , z] = svgToWorld(cx, cy);
  return [x, w.extrudeHeight / 2, z];
}

export function wallSize(w: WallDef): [number, number, number] {
  return [w.width / 95, w.extrudeHeight, w.height / 95];
}
