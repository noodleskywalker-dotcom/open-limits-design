/** Shared villa blueprint + 3D wall definitions (1200×675 viewBox → world units). */

export const VIEW_W = 1200;
export const VIEW_H = 675;
export const VIEW_CX = 600;
export const VIEW_CY = 340;

export type WallDef = {
  id: string;
  /** SVG rect bounds */
  x: number;
  y: number;
  width: number;
  height: number;
  extrudeHeight: number;
  kind: "living" | "suite" | "pool" | "elevation" | "glass" | "column" | "roof";
};

export const VILLA_WALLS: WallDef[] = [
  { id: "living-upper", x: 182, y: 182, width: 196, height: 116, extrudeHeight: 1.1, kind: "living" },
  { id: "suite-upper", x: 382, y: 182, width: 236, height: 116, extrudeHeight: 1.1, kind: "suite" },
  { id: "living-lower", x: 182, y: 302, width: 196, height: 114, extrudeHeight: 0.85, kind: "living" },
  { id: "suite-lower", x: 382, y: 302, width: 236, height: 114, extrudeHeight: 0.85, kind: "suite" },
  { id: "pool", x: 662, y: 342, width: 156, height: 136, extrudeHeight: 0.35, kind: "pool" },
  { id: "elev-main", x: 878, y: 182, width: 242, height: 296, extrudeHeight: 1.35, kind: "elevation" },
  { id: "glass-a", x: 400, y: 320, width: 120, height: 60, extrudeHeight: 0.5, kind: "glass" },
  { id: "glass-b", x: 920, y: 320, width: 160, height: 80, extrudeHeight: 0.55, kind: "glass" },
  { id: "col-l", x: 370, y: 200, width: 12, height: 100, extrudeHeight: 1.2, kind: "column" },
  { id: "col-r", x: 610, y: 200, width: 12, height: 100, extrudeHeight: 1.2, kind: "column" },
  { id: "roof-main", x: 180, y: 168, width: 440, height: 8, extrudeHeight: 0.15, kind: "roof" }
];

export const VILLA_MORPH_LINES = [
  { x1: 280, y1: 480, x2: 600, y2: 340 },
  { x1: 920, y1: 480, x2: 600, y2: 340 },
  { x1: 280, y1: 220, x2: 600, y2: 340 },
  { x1: 920, y1: 220, x2: 600, y2: 340 },
  { x1: 380, y1: 480, x2: 380, y2: 260 },
  { x1: 820, y1: 480, x2: 820, y2: 260 },
  { x1: 320, y1: 260, x2: 880, y2: 260 },
  { x1: 300, y1: 220, x2: 900, y2: 200 }
] as const;

export const LOGO_PATHS = {
  goldLine: { x1: 280, y1: 340, x2: 920, y2: 340 },
  frame: "M380 372 H820 V308 H380 Z",
  frameLeg: "M380 372 V398 H580",
  accent: "M420 340 H780"
} as const;

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
