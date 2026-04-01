"use client";

import { useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";

// ─── Public handle type so Scene3DBackground can call triggerBurst() ──────────
export interface Scene3DHandle {
  triggerBurst: () => void;
  moveToLeft: () => void;
  moveToRight: () => void;
}

// ─── Internal geometry — DO NOT modify colors/shapes/materials ────────────────
function FloatingGeometry({
  burstActive,
  burstStartMs,
  positionX,
}: {
  burstActive: React.MutableRefObject<boolean>;
  burstStartMs: React.MutableRefObject<number>;
  positionX: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Delta-based accumulated angles — lets us scale speed per-frame without jumps
  const rx = useRef(0);
  const ry = useRef(0);
  const wrx = useRef(0);
  const wry = useRef(0);
  const rrx = useRef(0);
  const rrz = useRef(0);
  const r2ry = useRef(0);
  const r2rz = useRef(0);

  useFrame((_, delta) => {
    // Update position with smooth animation
    if (groupRef.current) {
      // Smooth interpolation for position
      groupRef.current.position.x +=
        (positionX.current - groupRef.current.position.x) * 0.1;
    }

    // ── Burst multiplier: spikes to ~7× then decays to 1 over 600 ms ──
    const nowMs = Date.now();
    if (burstActive.current && nowMs - burstStartMs.current > 600) {
      burstActive.current = false;
    }
    const burstProgress = burstActive.current
      ? Math.max(0, 1 - (nowMs - burstStartMs.current) / 600) ** 2
      : 0;
    const m = 1 + burstProgress * 6; // 1× → 7× → 1×

    const d = delta * m;

    rx.current += 0.08 * d;
    ry.current += 0.12 * d;
    wrx.current -= 0.06 * d;
    wry.current += 0.09 * d;
    rrx.current += 0.15 * d;
    rrz.current += 0.05 * d;
    r2ry.current += 0.1 * d;
    r2rz.current -= 0.08 * d;

    if (meshRef.current) {
      meshRef.current.rotation.x = rx.current;
      meshRef.current.rotation.y = ry.current;
    }
    if (wireRef.current) {
      wireRef.current.rotation.x = wrx.current;
      wireRef.current.rotation.y = wry.current;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = rrx.current;
      ringRef.current.rotation.z = rrz.current;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = r2ry.current;
      ring2Ref.current.rotation.z = r2rz.current;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Floating moving particles around the sphere */}
      <Sparkles 
        count={100} 
        scale={4}       // Limits them to a 4-unit box around the sphere
        size={2}        // Particle size
        speed={0.3}     // Speed of random floating motion
        opacity={0.6}
        color="#8aa8ff" 
        noise={0.1}     // Amount of random wiggle
      />

      {/* Main icosahedron */}
      <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[1.1, 1]} />
          <MeshDistortMaterial
            color="#3761d4"
            wireframe={false}
            distort={0.15}
            speed={1.5}
            metalness={0.9}
            roughness={0.1}
            envMapIntensity={1}
          />
        </mesh>
        {/* Wireframe overlay */}
        <mesh ref={wireRef}>
          <icosahedronGeometry args={[1.13, 2]} />
          <meshBasicMaterial
            color="#43b5d5"
            wireframe
            transparent
            opacity={0.18}
          />
        </mesh>
      </Float>

      {/* Orbit ring 1 */}
      <mesh ref={ringRef} rotation={[1.2, 0, 0.3]}>
        <torusGeometry args={[1.5, 0.008, 8, 80]} />
        <meshBasicMaterial color="#37c2d4" transparent opacity={0.25} />
      </mesh>

      {/* Orbit ring 2 */}
      <mesh ref={ring2Ref} rotation={[0.5, 0.8, 0]}>
        <torusGeometry args={[1.5, 0.005, 8, 80]} />
        <meshBasicMaterial color="#379ad4" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────
const Scene3D = forwardRef<Scene3DHandle>((_, ref) => {
  const burstActive = useRef(false);
  const burstStartMs = useRef(2);
  const positionX = useRef(2);

  useImperativeHandle(ref, () => ({
    triggerBurst: () => {
      burstActive.current = true;
      burstStartMs.current = Date.now();
    },
    moveToLeft: () => {
      positionX.current = -2; // Move to left side
    },
    moveToRight: () => {
      positionX.current = 2; // Move to right side
    },
  }));

  return (
    // Canvas fills whatever container the parent gives it
    <Canvas
      camera={{ position: [1.2, 0, 4.5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#e8c97a" />
      <directionalLight
        position={[-5, -3, -2]}
        intensity={0.2}
        color="#4a6fff"
      />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#c9963c" />
      <Environment preset="night" />
      <FloatingGeometry
        burstActive={burstActive}
        burstStartMs={burstStartMs}
        positionX={positionX}
      />
    </Canvas>
  );
});

Scene3D.displayName = "Scene3D";
export default Scene3D;
