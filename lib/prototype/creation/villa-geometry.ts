/**
 * Single source of truth — villa geometry drives:
 * blueprint draw, 3D extrusion, logo collapse.
 * ViewBox 1200 × 675.
 */

export const VIEW_W = 1200;
export const VIEW_H = 675;
export const VIEW_CX = 600;
export const VIEW_CY = 340;
export const LOGO_ANCHOR = { x: 600, y: 340 } as const;

export type MaterialKind = "stone" | "glass" | "pool" | "gold" | "column" | "roof";

export type VillaElement = {
  id: string;
  order: number;
  category: "structure" | "opening" | "reference";
  label?: string;
  segments: Array<{ from: [number, number]; to: [number, number] }>;
  solid?: {
    x: number;
    y: number;
    width: number;
    height: number;
    extrudeHeight: number;
    material: MaterialKind;
  };
  /** Corners used for identity collapse toward logo */
  morphCorners?: [number, number][];
};

export type DrawSegment = {
  id: string;
  elementId: string;
  from: [number, number];
  to: [number, number];
  weight: "primary" | "room" | "opening" | "dim" | "gold";
};

/** ── Structure & openings (draw + extrude order) ── */
export const VILLA_ELEMENTS: VillaElement[] = [
  {
    id: "perimeter",
    order: 0,
    category: "structure",
    segments: [
      { from: [178, 418], to: [178, 182] },
      { from: [178, 182], to: [618, 182] },
      { from: [618, 182], to: [618, 418] },
      { from: [618, 418], to: [178, 418] }
    ],
    morphCorners: [
      [178, 182],
      [618, 182],
      [618, 418],
      [178, 418]
    ]
  },
  {
    id: "living-upper",
    order: 1,
    category: "structure",
    label: "LIVING · 14.2m",
    segments: [
      { from: [182, 182], to: [378, 182] },
      { from: [378, 182], to: [378, 298] },
      { from: [378, 298], to: [182, 298] },
      { from: [182, 298], to: [182, 182] }
    ],
    solid: { x: 182, y: 182, width: 196, height: 116, extrudeHeight: 1.12, material: "stone" },
    morphCorners: [
      [182, 182],
      [378, 182],
      [378, 298],
      [182, 298]
    ]
  },
  {
    id: "suite-upper",
    order: 2,
    category: "structure",
    label: "MASTER SUITE",
    segments: [
      { from: [382, 182], to: [618, 182] },
      { from: [618, 182], to: [618, 298] },
      { from: [618, 298], to: [382, 298] },
      { from: [382, 298], to: [382, 182] }
    ],
    solid: { x: 382, y: 182, width: 236, height: 116, extrudeHeight: 1.12, material: "stone" },
    morphCorners: [
      [382, 182],
      [618, 182],
      [618, 298],
      [382, 298]
    ]
  },
  {
    id: "col-l",
    order: 3,
    category: "structure",
    segments: [
      { from: [370, 200], to: [370, 300] },
      { from: [382, 200], to: [382, 300] }
    ],
    solid: { x: 370, y: 200, width: 12, height: 100, extrudeHeight: 1.25, material: "column" },
    morphCorners: [
      [370, 200],
      [382, 300]
    ]
  },
  {
    id: "col-r",
    order: 4,
    category: "structure",
    segments: [
      { from: [610, 200], to: [610, 300] },
      { from: [622, 200], to: [622, 300] }
    ],
    solid: { x: 610, y: 200, width: 12, height: 100, extrudeHeight: 1.25, material: "column" },
    morphCorners: [
      [610, 200],
      [622, 300]
    ]
  },
  {
    id: "living-lower",
    order: 5,
    category: "structure",
    segments: [
      { from: [182, 302], to: [378, 302] },
      { from: [378, 302], to: [378, 416] },
      { from: [378, 416], to: [182, 416] },
      { from: [182, 416], to: [182, 302] }
    ],
    solid: { x: 182, y: 302, width: 196, height: 114, extrudeHeight: 0.88, material: "stone" },
    morphCorners: [
      [182, 302],
      [378, 416]
    ]
  },
  {
    id: "suite-lower",
    order: 6,
    category: "structure",
    segments: [
      { from: [382, 302], to: [618, 302] },
      { from: [618, 302], to: [618, 416] },
      { from: [618, 416], to: [382, 416] },
      { from: [382, 416], to: [382, 302] }
    ],
    solid: { x: 382, y: 302, width: 236, height: 114, extrudeHeight: 0.88, material: "stone" },
    morphCorners: [
      [382, 302],
      [618, 416]
    ]
  },
  {
    id: "door-living",
    order: 7,
    category: "opening",
    segments: [
      { from: [280, 416], to: [280, 386] },
      { from: [280, 386], to: [310, 366] },
      { from: [310, 366], to: [340, 386] }
    ]
  },
  {
    id: "door-suite",
    order: 8,
    category: "opening",
    segments: [
      { from: [480, 302], to: [510, 302] },
      { from: [510, 302], to: [540, 322] },
      { from: [540, 322], to: [510, 342] }
    ]
  },
  {
    id: "windows-living",
    order: 9,
    category: "opening",
    segments: [
      { from: [220, 182], to: [260, 182] },
      { from: [300, 182], to: [340, 182] },
      { from: [220, 298], to: [260, 298] }
    ]
  },
  {
    id: "glass-band",
    order: 10,
    category: "structure",
    segments: [
      { from: [400, 320], to: [520, 320] },
      { from: [520, 320], to: [520, 380] },
      { from: [520, 380], to: [400, 380] },
      { from: [400, 380], to: [400, 320] }
    ],
    solid: { x: 400, y: 320, width: 120, height: 60, extrudeHeight: 0.52, material: "glass" },
    morphCorners: [
      [400, 320],
      [520, 380]
    ]
  },
  {
    id: "pool",
    order: 11,
    category: "structure",
    label: "POOL",
    segments: [
      { from: [662, 342], to: [818, 342] },
      { from: [818, 342], to: [818, 478] },
      { from: [818, 478], to: [662, 478] },
      { from: [662, 478], to: [662, 342] }
    ],
    solid: { x: 662, y: 342, width: 156, height: 136, extrudeHeight: 0.32, material: "pool" },
    morphCorners: [
      [662, 342],
      [818, 478]
    ]
  },
  {
    id: "elevation",
    order: 12,
    category: "structure",
    label: "ELEVATION A",
    segments: [
      { from: [878, 478], to: [882, 222] },
      { from: [882, 222], to: [1042, 182] },
      { from: [1042, 182], to: [1118, 202] },
      { from: [1118, 202], to: [1120, 478] },
      { from: [1120, 478], to: [878, 478] }
    ],
    solid: { x: 878, y: 182, width: 242, height: 296, extrudeHeight: 1.38, material: "stone" },
    morphCorners: [
      [878, 478],
      [1118, 202],
      [1042, 182]
    ]
  },
  {
    id: "glass-elev",
    order: 13,
    category: "structure",
    segments: [
      { from: [920, 320], to: [1080, 320] },
      { from: [1080, 320], to: [1080, 400] },
      { from: [1080, 400], to: [920, 400] },
      { from: [920, 400], to: [920, 320] }
    ],
    solid: { x: 920, y: 320, width: 160, height: 80, extrudeHeight: 0.55, material: "glass" },
    morphCorners: [
      [920, 320],
      [1080, 400]
    ]
  },
  {
    id: "roof",
    order: 14,
    category: "structure",
    segments: [
      { from: [180, 168], to: [620, 168] },
      { from: [620, 168], to: [620, 176] },
      { from: [620, 176], to: [180, 176] },
      { from: [180, 176], to: [180, 168] }
    ],
    solid: { x: 180, y: 168, width: 440, height: 8, extrudeHeight: 0.18, material: "roof" },
    morphCorners: [
      [180, 168],
      [620, 168]
    ]
  },
  {
    id: "section-cut",
    order: 15,
    category: "reference",
    segments: [
      { from: [860, 160], to: [860, 490] },
      { from: [852, 160], to: [868, 160] },
      { from: [852, 490], to: [868, 490] }
    ]
  },
  {
    id: "dim-width",
    order: 16,
    category: "reference",
    segments: [
      { from: [182, 542], to: [618, 542] },
      { from: [182, 550], to: [182, 534] },
      { from: [618, 550], to: [618, 534] }
    ]
  },
  {
    id: "dim-height",
    order: 17,
    category: "reference",
    segments: [
      { from: [138, 182], to: [138, 416] },
      { from: [130, 182], to: [146, 182] },
      { from: [130, 416], to: [146, 416] }
    ]
  },
  {
    id: "scale-bar",
    order: 18,
    category: "reference",
    segments: [
      { from: [100, 558], to: [180, 558] },
      { from: [100, 552], to: [100, 564] },
      { from: [180, 552], to: [180, 564] }
    ]
  },
  {
    id: "north",
    order: 19,
    category: "reference",
    segments: [
      { from: [1048, 558], to: [1048, 522] },
      { from: [1028, 542], to: [1048, 522] },
      { from: [1068, 542], to: [1048, 522] }
    ]
  }
];

export const ELEMENT_BY_ID = Object.fromEntries(VILLA_ELEMENTS.map((e) => [e.id, e])) as Record<
  string,
  VillaElement
>;

function weightFor(el: VillaElement, segIdx: number): DrawSegment["weight"] {
  if (el.category === "reference") return segIdx === 0 ? "dim" : "dim";
  if (el.category === "opening") return "opening";
  if (el.id === "perimeter" || el.id === "elevation" || el.id === "roof") return "gold";
  if (el.solid?.material === "pool") return "room";
  return "room";
}

/** Flat draw order — pencil follows this path physically */
export const DRAW_SEQUENCE: DrawSegment[] = VILLA_ELEMENTS.flatMap((el) =>
  el.segments.map((seg, i) => ({
    id: `${el.id}-${i}`,
    elementId: el.id,
    from: seg.from,
    to: seg.to,
    weight: weightFor(el, i)
  }))
);

/** Grid lines — reference only, faint */
export const BLUEPRINT_GRID = {
  vertical: Array.from({ length: 13 }, (_, i) => 80 + i * 80),
  horizontal: Array.from({ length: 8 }, (_, i) => 60 + i * 80)
};

export const BLUEPRINT_TITLE = "VILLA TYPE A — GROUND FLOOR";
export const BLUEPRINT_SCALE = "SCALE 1:100 · SHEET A-01";

/** Logo linework — born from collapsed geometry (same coordinate space) */
export const LOGO_LINES = {
  gold: { from: [280, 340] as [number, number], to: [920, 340] as [number, number] },
  frameTop: { from: [380, 308] as [number, number], to: [820, 308] as [number, number] },
  frameRight: { from: [820, 308] as [number, number], to: [820, 372] as [number, number] },
  frameBottom: { from: [820, 372] as [number, number], to: [380, 372] as [number, number] },
  frameLeft: { from: [380, 372] as [number, number], to: [380, 308] as [number, number] },
  frameLeg: { from: [380, 372] as [number, number], to: [580, 398] as [number, number] },
  accent: { from: [420, 340] as [number, number], to: [780, 340] as [number, number] }
} as const;

export type MorphRay = { from: [number, number]; to: [number, number]; elementId: string };

export const MORPH_RAYS: MorphRay[] = VILLA_ELEMENTS.flatMap((el) =>
  (el.morphCorners ?? []).map((corner, i) => ({
    from: corner,
    to: [LOGO_ANCHOR.x, LOGO_ANCHOR.y] as [number, number],
    elementId: `${el.id}-${i}`
  }))
);

export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function identityCollapseT(identityT: number) {
  return easeOutCubic(identityT);
}

export function svgToWorld(sx: number, sy: number): [number, number, number] {
  const x = (sx - VIEW_CX) / 95;
  const z = (sy - 420) / 95;
  return [x, 0, z];
}

export function worldToSvg(x: number, z: number): [number, number] {
  return [x * 95 + VIEW_CX, z * 95 + 420];
}

export function materialColor(m: MaterialKind): string {
  switch (m) {
    case "pool":
      return "#6a9ab8";
    case "glass":
      return "#a8c8d8";
    case "gold":
    case "roof":
      return "#c8a24a";
    case "column":
      return "#e8dcc8";
    default:
      return "#f0f0ec";
  }
}

export function strokeColor(weight: DrawSegment["weight"], warmth = 0): string {
  const w = warmth;
  switch (weight) {
    case "gold":
      return `rgb(${Math.round(200 + 20 * w)} ${Math.round(162 + 30 * w)} ${Math.round(74 + 40 * w)} / 0.92)`;
    case "opening":
      return `rgb(90 200 255 / ${(0.55 + w * 0.2).toFixed(2)})`;
    case "dim":
      return `rgb(140 190 235 / ${(0.42 + w * 0.15).toFixed(2)})`;
    case "room":
      return `rgb(${Math.round(100 + 140 * w)} ${Math.round(170 + 66 * w)} ${Math.round(235 - 47 * w)} / 0.78)`;
    default:
      return `rgb(120 185 240 / 0.82)`;
  }
}

// Legacy exports for any remaining imports
export const VILLA_WALLS = VILLA_ELEMENTS.filter((e) => e.solid).map((e) => ({
  id: e.id,
  x: e.solid!.x,
  y: e.solid!.y,
  width: e.solid!.width,
  height: e.solid!.height,
  extrudeHeight: e.solid!.extrudeHeight,
  kind: e.solid!.material === "stone" ? ("living" as const) : (e.solid!.material as "pool"),
  order: e.order
}));

export const LOGO_ANCHOR_PT = LOGO_ANCHOR;
export const LOGO_PATHS = {
  goldLine: { x1: LOGO_LINES.gold.from[0], y1: LOGO_LINES.gold.from[1], x2: LOGO_LINES.gold.to[0], y2: LOGO_LINES.gold.to[1] },
  frame: "M380 372 H820 V308 H380 Z",
  frameLeg: "M380 372 V398 H580",
  accent: "M420 340 H780"
};
