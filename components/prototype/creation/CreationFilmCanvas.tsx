"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Line, OrthographicCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { beatProgress, type FilmBeat } from "@/lib/prototype/creation/creation-constants";
import {
  allExtrudeStates,
  segmentDrawStates,
  type SegmentDrawState
} from "@/lib/prototype/creation/film-draw";
import {
  BLUEPRINT_GRID,
  DRAW_SEQUENCE,
  ELEMENT_BY_ID,
  identityCollapseT,
  LOGO_LINES,
  LOGO_ANCHOR,
  materialColor,
  MORPH_RAYS,
  strokeColor,
  svgToWorld,
  type DrawSegment,
  type MaterialKind
} from "@/lib/prototype/creation/villa-geometry";

type CreationFilmCanvasProps = {
  elapsed: number;
  beat: FilmBeat;
  isMobile: boolean;
};

function segmentWorldPoints(
  seg: DrawSegment,
  reveal: number
): [number, number, number][] {
  const fx = seg.from[0] + (seg.to[0] - seg.from[0]) * reveal;
  const fy = seg.from[1] + (seg.to[1] - seg.from[1]) * reveal;
  const [x0, , z0] = svgToWorld(seg.from[0], seg.from[1]);
  const [x1, , z1] = svgToWorld(fx, fy);
  return [
    [x0, 0.025, z0],
    [x1, 0.025, z1]
  ];
}

function BlueprintSegment({
  seg,
  state
}: {
  seg: DrawSegment;
  state: SegmentDrawState;
}) {
  if (state.reveal <= 0.001 || state.opacity <= 0.01) return null;
  const pts = segmentWorldPoints(seg, state.reveal);
  const warmth = 1 - state.opacity;
  return (
    <Line
      color={strokeColor(seg.weight, warmth)}
      lineWidth={seg.weight === "gold" ? 1.8 : seg.weight === "dim" ? 0.8 : 1.2}
      opacity={state.opacity}
      points={pts}
      transparent
    />
  );
}

function StructureSolid({
  elementId,
  progress,
  identityT,
  material
}: {
  elementId: string;
  progress: number;
  identityT: number;
  material: MaterialKind;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const el = ELEMENT_BY_ID[elementId];
  const visible = Boolean(el?.solid && progress > 0.001);

  const s = el?.solid;
  const sx = s ? s.width / 95 : 1;
  const sy = s?.extrudeHeight ?? 1;
  const sz = s ? s.height / 95 : 1;
  const [cx, , cz] = s
    ? svgToWorld(s.x + s.width / 2, s.y + s.height / 2)
    : ([0, 0, 0] as [number, number, number]);
  const collapse = identityCollapseT(identityT);
  const solidFade = Math.max(0, 1 - collapse * 1.25);
  const wire = collapse > 0.05 ? Math.min(1, collapse * 1.6) : 0;

  useFrame(() => {
    if (!visible || !s) return;
    const m = meshRef.current;
    if (!m) return;
    const rise = Math.max(0.001, progress);
    m.scale.y = rise * (identityT > 0 ? Math.max(0.05, 1 - collapse * 0.94) : 1);
    m.position.y = (sy * rise * m.scale.y) / 2;
  });

  if (!visible || !s) return null;

  return (
    <mesh ref={meshRef} position={[cx, 0, cz]}>
      <boxGeometry args={[sx, sy, sz]} />
      <meshStandardMaterial
        color={materialColor(material)}
        emissive="#c8a24a"
        emissiveIntensity={progress * 0.14 + wire * 0.5}
        metalness={material === "glass" ? 0.65 : 0.12}
        opacity={(0.9 + progress * 0.1) * solidFade}
        roughness={material === "glass" ? 0.08 : 0.52}
        transparent
      />
      {wire > 0.04 ? <Edges color="#c8a24a" linewidth={1} threshold={15} /> : null}
    </mesh>
  );
}

function MorphRays({ identityT }: { identityT: number }) {
  const collapse = identityCollapseT(identityT);
  if (collapse <= 0.02) return null;

  return (
    <>
      {MORPH_RAYS.map((ray, i) => {
        const [x0, , z0] = svgToWorld(ray.from[0], ray.from[1]);
        const [x1, , z1] = svgToWorld(ray.to[0], ray.to[1]);
        const pull = collapse * 0.94;
        const ax = x0 + (x1 - x0) * pull;
        const az = z0 + (z1 - z0) * pull;
        const y = 0.08 + collapse * 0.5;
        return (
          <Line
            color="#c8a24a"
            key={i}
            lineWidth={1.3}
            opacity={Math.max(0, 0.9 - collapse * 0.85)}
            points={[
              [x0, y, z0],
              [ax, y + collapse * 0.35, az]
            ]}
            transparent
          />
        );
      })}
    </>
  );
}

function LogoLines3D({ identityT }: { identityT: number }) {
  const draw = identityCollapseT(Math.max(0, (identityT - 0.42) / 0.58));
  if (draw <= 0.01) return null;

  const lines = Object.values(LOGO_LINES);
  return (
    <>
      {lines.map((line, i) => {
        const [x0, , z0] = svgToWorld(
          LOGO_ANCHOR.x + (line.from[0] - LOGO_ANCHOR.x) * (1 - draw),
          LOGO_ANCHOR.y + (line.from[1] - LOGO_ANCHOR.y) * (1 - draw)
        );
        const [x1, , z1] = svgToWorld(
          LOGO_ANCHOR.x + (line.to[0] - LOGO_ANCHOR.x) * draw,
          LOGO_ANCHOR.y + (line.to[1] - LOGO_ANCHOR.y) * draw
        );
        return (
          <Line
            color={i === 0 ? "#c8a24a" : "#f5f0e8"}
            key={i}
            lineWidth={i === 0 ? 2.2 : 1.6}
            opacity={Math.min(1, draw * 1.35)}
            points={[
              [x0, 0.12 + draw * 0.08, z0],
              [x1, 0.12 + draw * 0.08, z1]
            ]}
            transparent
          />
        );
      })}
    </>
  );
}

function GridLines({ opacity }: { opacity: number }) {
  const lines = useMemo(() => {
    const out: [number, number, number][][] = [];
    for (const x of BLUEPRINT_GRID.vertical) {
      const [wx, , z0] = svgToWorld(x, 60);
      const [, , z1] = svgToWorld(x, 615);
      out.push([
        [wx, 0.01, z0],
        [wx, 0.01, z1]
      ]);
    }
    for (const y of BLUEPRINT_GRID.horizontal) {
      const [x0, , wz] = svgToWorld(80, y);
      const [x1, , wz2] = svgToWorld(1120, y);
      out.push([
        [x0, 0.01, wz],
        [x1, 0.01, wz2]
      ]);
    }
    return out;
  }, []);

  if (opacity <= 0.01) return null;
  return (
    <>
      {lines.map((pts, i) => (
        <Line color="#5a90c8" key={i} lineWidth={0.5} opacity={opacity * 0.12} points={pts} transparent />
      ))}
    </>
  );
}

function FilmScene({ elapsed, beat }: { elapsed: number; beat: FilmBeat }) {
  const groupRef = useRef<THREE.Group>(null);
  const drawT = beatProgress(elapsed, "drawing", "moment");
  const momentT = beatProgress(elapsed, "moment", "architecture");
  const archT = beatProgress(elapsed, "architecture", "identity");
  const identityT = beatProgress(elapsed, "identity", "end");
  const collapse = identityCollapseT(identityT);

  const segStates = segmentDrawStates(elapsed);
  const extrudes = allExtrudeStates(momentT);

  const showBlueprint = beat !== "opening";
  const showSolids = momentT > 0 || beat === "architecture" || beat === "identity";
  const gridOpacity =
    beat === "drawing" ? 0.55 : beat === "moment" ? 0.25 * (1 - momentT) : beat === "architecture" ? 0.08 : 0;

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;

    if (beat === "identity" || beat === "end") {
      const s = 1 - collapse * 0.76;
      g.scale.set(s, Math.max(0.04, 1 - collapse * 0.95), s);
      g.position.y = -0.28 + collapse * 0.5;
      g.rotation.y = -0.26 + collapse * 0.38;
      g.rotation.x = 0.38 - collapse * 0.32;
    } else if (beat === "architecture") {
      g.scale.set(1, 1, 1);
      g.position.y = -0.28;
      g.rotation.y = -0.26 + archT * 0.1;
      g.rotation.x = 0.38 - archT * 0.06;
    } else if (beat === "moment") {
      g.scale.set(1, 1, 1);
      g.position.y = -0.28;
      g.rotation.y = -0.26 + momentT * 0.06;
      g.rotation.x = 0.55 - momentT * 0.22;
    } else {
      g.scale.set(1, 1, 1);
      g.position.y = -0.28;
      g.rotation.y = -0.08;
      g.rotation.x = 0.62;
    }

    const drift =
      beat === "architecture" ? archT * 0.35 : beat === "moment" ? momentT * 0.12 : 0;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, drift * 0.5, 0.025);
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      4.2 - (beat === "architecture" ? archT * 0.4 : 0) - collapse * 0.8,
      0.03
    );
  });

  return (
    <>
      <ambientLight
        color="#fff5e8"
        intensity={0.22 + momentT * 0.28 + archT * 0.22 - collapse * 0.08}
      />
      <directionalLight
        color="#ffd090"
        intensity={0.35 + momentT * 0.45 + archT * 0.55}
        position={[5, 9, 4]}
      />
      <pointLight
        color="#c8a24a"
        intensity={archT * 1.4 + collapse * 0.6}
        position={[1, 3, 2]}
      />

      <group ref={groupRef} position={[0, -0.28, 0]}>
        {showBlueprint ? <GridLines opacity={gridOpacity} /> : null}

        {showBlueprint
          ? DRAW_SEQUENCE.map((seg, i) => (
              <BlueprintSegment key={seg.id} seg={seg} state={segStates[i]} />
            ))
          : null}

        {showSolids
          ? extrudes.map(({ elementId, progress }) => {
              const el = ELEMENT_BY_ID[elementId];
              if (!el?.solid) return null;
              return (
                <StructureSolid
                  elementId={elementId}
                  identityT={identityT}
                  key={elementId}
                  material={el.solid.material}
                  progress={beat === "architecture" || beat === "identity" || beat === "end" ? 1 : progress}
                />
              );
            })
          : null}

        {showSolids && momentT > 0.35 && collapse < 0.88 ? (
          <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14, 8]} />
            <meshStandardMaterial
              color="#141412"
              metalness={0.15}
              opacity={Math.max(0, 0.85 - collapse * 0.9)}
              roughness={0.88}
              transparent
            />
          </mesh>
        ) : null}

        {beat === "identity" || beat === "end" ? (
          <>
            <MorphRays identityT={identityT} />
            <LogoLines3D identityT={identityT} />
          </>
        ) : null}
      </group>
    </>
  );
}

export default function CreationFilmCanvas({ elapsed, beat, isMobile }: CreationFilmCanvasProps) {
  const visible = beat !== "opening" || elapsed > 1200;
  const identityT = beatProgress(elapsed, "identity", "end");
  const canvasOpacity =
    beat === "identity" || beat === "end" ? Math.max(0.35, 1 - identityCollapseT(identityT) * 0.45) : 1;

  if (!visible && elapsed < 1200) return null;

  return (
    <div
      aria-hidden
      className="olcrt-canvas-wrap olcrt-film-canvas"
      style={{ opacity: canvasOpacity }}
    >
      <Canvas
        className="olcrt-canvas"
        dpr={isMobile ? [1, 1.25] : [1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <OrthographicCamera makeDefault position={[0, 4.2, 8]} zoom={isMobile ? 50 : 60} />
        <color attach="background" args={["#000000"]} />
        <FilmScene beat={beat} elapsed={elapsed} />
      </Canvas>
    </div>
  );
}
