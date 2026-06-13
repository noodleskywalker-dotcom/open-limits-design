"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrthographicCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  creationPhaseAtOrAfter,
  phaseProgress,
  type CreationPhase
} from "@/lib/prototype/creation/creation-constants";
import {
  VILLA_WALLS,
  svgToWorld,
  wallSize,
  type WallDef
} from "@/lib/prototype/creation/villa-geometry";

type CreationCanvasProps = {
  phase: CreationPhase;
  elapsed: number;
  isMobile: boolean;
};

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function WallMesh({
  wall,
  progress,
  index
}: {
  wall: WallDef;
  progress: number;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const stagger = index * 0.06;
  const localT = easeOutCubic(Math.max(0, Math.min(1, (progress - stagger) / (1 - stagger * 0.45))));

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

  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    m.scale.y = Math.max(0.001, localT);
    m.position.y = (sy * localT) / 2;
  });

  return (
    <mesh ref={meshRef} position={[cx, 0, cz]}>
      <boxGeometry args={[sx, sy, sz]} />
      <meshStandardMaterial
        color={color}
        emissive={wall.kind === "roof" ? "#c8a24a" : "#c8a24a"}
        emissiveIntensity={localT * (wall.kind === "glass" ? 0.35 : 0.12)}
        metalness={wall.kind === "glass" ? 0.6 : 0.15}
        opacity={0.88 + localT * 0.12}
        roughness={wall.kind === "glass" ? 0.1 : 0.55}
        transparent
      />
    </mesh>
  );
}

function BlueprintLines({ opacity, color }: { opacity: number; color: string }) {
  const outline: [number, number, number][] = useMemo(() => {
    const pts: [number, number, number][] = [];
    const corners = [
      [178, 418],
      [178, 182],
      [618, 182],
      [618, 418],
      [178, 418]
    ];
    for (const [sx, sy] of corners) {
      const [x, , z] = svgToWorld(sx, sy);
      pts.push([x, 0.02, z]);
    }
    return pts;
  }, []);

  const elev: [number, number, number][] = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (const [sx, sy] of [
      [878, 478],
      [882, 222],
      [1042, 182],
      [1118, 202],
      [1120, 478],
      [878, 478]
    ]) {
      const [x, , z] = svgToWorld(sx, sy);
      pts.push([x, 0.02, z]);
    }
    return pts;
  }, []);

  if (opacity <= 0.02) return null;

  return (
    <>
      <Line color={color} lineWidth={1.2} opacity={opacity} points={outline} transparent />
      <Line color={color} lineWidth={1} opacity={opacity * 0.85} points={elev} transparent />
    </>
  );
}

function SceneContent({ phase, elapsed }: { phase: CreationPhase; elapsed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const transformT = phaseProgress(elapsed, "transform", "villa");
  const villaT = phaseProgress(elapsed, "villa", "brand");
  const brandT = phaseProgress(elapsed, "brand", "enter");
  const show3d =
    creationPhaseAtOrAfter(phase, "transform") &&
    phase !== "enter";

  const blueprintOpacity =
    phase === "transform" ? Math.max(0.15, 1 - transformT * 0.85) : phase === "villa" ? 0.12 : 0;

  const blueprintColor = transformT > 0.2 ? "#c8a24a" : "#78b8f0";

  const camDrift =
    phase === "brand" ? brandT * 0.2 : creationPhaseAtOrAfter(phase, "villa") ? villaT * 0.4 : transformT * 0.15;

  useFrame((state) => {
    const g = groupRef.current;
    if (!g || !show3d) return;

    if (phase === "brand") {
      const collapse = easeOutCubic(brandT);
      g.scale.setScalar(1 - collapse * 0.72);
      g.position.y = -0.3 + collapse * 0.15;
      g.rotation.y = -0.28 + collapse * 0.35;
      g.rotation.x = 0.42 - collapse * 0.2;
    } else {
      g.scale.setScalar(1);
      g.position.y = -0.3;
      g.rotation.y = -0.28 + camDrift * 0.08;
      g.rotation.x = 0.42 - camDrift * 0.04;
    }

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, camDrift * 0.6, 0.02);
  });

  if (!show3d && phase !== "blueprint") return null;

  return (
    <>
      <ambientLight color="#fff5e8" intensity={0.35 + transformT * 0.25 + villaT * 0.15} />
      <directionalLight
        castShadow
        color="#ffd090"
        intensity={0.6 + villaT * 0.5}
        position={[4, 8, 3]}
      />
      <pointLight color="#c8a24a" intensity={villaT * 1.2} position={[0, 2, 1]} />

      <group ref={groupRef} position={[0, -0.3, 0]}>
        {phase === "transform" || phase === "villa" ? (
          <BlueprintLines color={blueprintColor} opacity={blueprintOpacity} />
        ) : null}
        {show3d
          ? VILLA_WALLS.map((wall, i) => (
              <WallMesh index={i} key={wall.id} progress={Math.min(1, transformT + villaT * 0.05)} wall={wall} />
            ))
          : null}
        {show3d && transformT > 0.45 ? (
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14, 8]} />
            <meshStandardMaterial color="#1a1a18" metalness={0.2} roughness={0.85} />
          </mesh>
        ) : null}
      </group>
    </>
  );
}

export default function CreationCanvas({ phase, elapsed, isMobile }: CreationCanvasProps) {
  const visible =
    creationPhaseAtOrAfter(phase, "transform") && phase !== "enter";

  if (!visible) return null;

  return (
    <div aria-hidden className="olcrt-canvas-wrap">
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
