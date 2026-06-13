"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Line, OrthographicCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  creationPhaseAtOrAfter,
  phaseProgress,
  type CreationPhase
} from "@/lib/prototype/creation/creation-constants";
import {
  brandCollapseT,
  svgToWorld,
  VILLA_MORPH_LINES,
  VILLA_WALLS,
  wallExtrudeProgress,
  wallSize,
  type WallDef
} from "@/lib/prototype/creation/villa-geometry";

type CreationCanvasProps = {
  phase: CreationPhase;
  elapsed: number;
  isMobile: boolean;
};

function WallMesh({
  wall,
  transformT,
  brandT,
  phase
}: {
  wall: WallDef;
  transformT: number;
  brandT: number;
  phase: CreationPhase;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const localT = wallExtrudeProgress(transformT, wall.id);
  const collapse = phase === "brand" ? brandCollapseT(brandT) : 0;

  const [sx, sy, sz] = wallSize(wall);
  const [cx, , cz] = svgToWorld(wall.x + wall.width / 2, wall.y + wall.height / 2);
  const color =
    wall.kind === "pool"
      ? "#6a9ab8"
      : wall.kind === "glass"
        ? "#a8c8d8"
        : wall.kind === "roof"
          ? "#c8a24a"
          : wall.kind === "column"
            ? "#e8dcc8"
            : "#f0f0ec";

  const solidFade = phase === "brand" ? Math.max(0, 1 - collapse * 1.35) : 1;
  const wireBoost = phase === "brand" ? Math.min(1, collapse * 1.8) : 0;

  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    const rise = Math.max(0.001, localT);
    m.scale.y = rise * (phase === "brand" ? Math.max(0.06, 1 - collapse * 0.92) : 1);
    m.position.y = (sy * rise * m.scale.y) / 2;
  });

  if (localT <= 0.001 && phase !== "villa" && phase !== "brand") return null;

  return (
    <mesh ref={meshRef} position={[cx, 0, cz]}>
      <boxGeometry args={[sx, sy, sz]} />
      <meshStandardMaterial
        color={color}
        emissive="#c8a24a"
        emissiveIntensity={localT * (wall.kind === "glass" ? 0.35 : 0.12) + wireBoost * 0.45}
        metalness={wall.kind === "glass" ? 0.6 : 0.15}
        opacity={(0.88 + localT * 0.12) * solidFade}
        roughness={wall.kind === "glass" ? 0.1 : 0.55}
        transparent
      />
      {wireBoost > 0.05 ? (
        <Edges linewidth={1} threshold={15}>
          <lineBasicMaterial color="#c8a24a" opacity={wireBoost * 0.95} transparent />
        </Edges>
      ) : null}
    </mesh>
  );
}

function MorphEdgeLines({ brandT }: { brandT: number }) {
  const collapse = brandCollapseT(brandT);
  const lines = useMemo(() => {
    return VILLA_MORPH_LINES.map((line) => {
      const [x1, , z1] = svgToWorld(line.x1, line.y1);
      const [x2, , z2] = svgToWorld(line.x2, line.y2);
      return { x1, z1, x2, z2 };
    });
  }, []);

  if (collapse <= 0.02) return null;

  return (
    <>
      {lines.map((line, i) => {
        const pull = collapse * 0.95;
        const ax = line.x1 + (line.x2 - line.x1) * pull;
        const az = line.z1 + (line.z2 - line.z1) * pull;
        const y = 0.15 + collapse * 0.8;
        return (
          <Line
            color="#c8a24a"
            key={i}
            lineWidth={1.2}
            opacity={Math.max(0, 0.85 - collapse * 0.7)}
            points={[
              [line.x1, y, line.z1],
              [ax, y + collapse * 0.4, az]
            ]}
            transparent
          />
        );
      })}
    </>
  );
}

function SceneContent({ phase, elapsed }: { phase: CreationPhase; elapsed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const transformT = phaseProgress(elapsed, "transform", "villa");
  const villaT = phaseProgress(elapsed, "villa", "brand");
  const brandT = phaseProgress(elapsed, "brand", "enter");
  const collapse = brandCollapseT(brandT);
  const show3d = creationPhaseAtOrAfter(phase, "transform") && phase !== "enter";

  const camDrift =
    phase === "brand"
      ? collapse * 0.25
      : creationPhaseAtOrAfter(phase, "villa")
        ? villaT * 0.4
        : transformT * 0.15;

  useFrame((state) => {
    const g = groupRef.current;
    if (!g || !show3d) return;

    if (phase === "brand") {
      const s = 1 - collapse * 0.78;
      g.scale.set(s, Math.max(0.04, 1 - collapse * 0.94), s);
      g.position.y = -0.3 + collapse * 0.55;
      g.rotation.y = -0.28 + collapse * 0.42;
      g.rotation.x = 0.42 - collapse * 0.38;
    } else {
      g.scale.set(1, 1, 1);
      g.position.y = -0.3;
      g.rotation.y = -0.28 + camDrift * 0.08;
      g.rotation.x = 0.42 - camDrift * 0.04;
    }

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, camDrift * 0.6, 0.02);
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      4 - (phase === "brand" ? collapse * 1.2 : 0),
      0.03
    );
  });

  if (!show3d) return null;

  const effectiveTransformT = phase === "villa" || phase === "brand" ? 1 : transformT;

  return (
    <>
      <ambientLight
        color="#fff5e8"
        intensity={0.35 + effectiveTransformT * 0.25 + villaT * 0.15 - collapse * 0.1}
      />
      <directionalLight
        castShadow
        color="#ffd090"
        intensity={0.6 + villaT * 0.5 - collapse * 0.15}
        position={[4, 8, 3]}
      />
      <pointLight
        color="#c8a24a"
        intensity={villaT * 1.2 + collapse * 0.8}
        position={[0, 2, 1]}
      />

      <group ref={groupRef} position={[0, -0.3, 0]}>
        {VILLA_WALLS.map((wall) => (
          <WallMesh
            brandT={brandT}
            key={wall.id}
            phase={phase}
            transformT={effectiveTransformT}
            wall={wall}
          />
        ))}
        {phase === "brand" ? <MorphEdgeLines brandT={brandT} /> : null}
        {effectiveTransformT > 0.45 && collapse < 0.85 ? (
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14, 8]} />
            <meshStandardMaterial
              color="#1a1a18"
              metalness={0.2}
              opacity={Math.max(0, 1 - collapse * 1.1)}
              roughness={0.85}
              transparent
            />
          </mesh>
        ) : null}
      </group>
    </>
  );
}

export default function CreationCanvas({ phase, elapsed, isMobile }: CreationCanvasProps) {
  const visible = creationPhaseAtOrAfter(phase, "transform") && phase !== "enter";

  if (!visible) return null;

  const brandT = phaseProgress(elapsed, "brand", "enter");
  const canvasOpacity = phase === "brand" ? Math.max(0, 1 - brandCollapseT(brandT) * 0.55) : 1;

  return (
    <div
      aria-hidden
      className="olcrt-canvas-wrap"
      style={{ opacity: canvasOpacity, transition: "opacity 0.05s linear" }}
    >
      <Canvas
        className="olcrt-canvas"
        dpr={isMobile ? [1, 1.25] : [1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <OrthographicCamera makeDefault position={[0, 4, 8]} zoom={isMobile ? 48 : 58} />
        <color attach="background" args={["#020202"]} />
        <SceneContent elapsed={elapsed} phase={phase} />
      </Canvas>
    </div>
  );
}
