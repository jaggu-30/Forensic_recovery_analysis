import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const starts = [
  [-1.45, 0.35, 0.65],
  [-0.95, -0.45, 0.8],
  [-0.45, 0.2, 0.9],
  [0, -0.25, 1.0],
  [0.45, 0.25, 0.9],
  [0.95, -0.4, 0.8],
  [1.45, 0.35, 0.65],
];

const targets = [
  [-4.8, 3.25, 2.8],
  [-3.2, 3.25, 2.8],
  [-1.6, 3.25, 2.8],
  [0, 3.25, 2.8],
  [1.6, 3.25, 2.8],
  [3.2, 3.25, 2.8],
  [4.8, 3.25, 2.8],
];

function ease(t) {
  return t * t * (3 - 2 * t);
}

function lerpPoint(a, b, t) {
  return new THREE.Vector3(
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t)
  );
}

function FallingStar({ index, progress }) {
  const headRef = useRef();
  const trailRefs = useRef([]);
  const current = useRef(new THREE.Vector3(...starts[index]));

  const start = starts[index];
  const target = targets[index];

  useEffect(() => {
    trailRefs.current = trailRefs.current.filter(Boolean);
  }, []);

  useFrame((state, delta) => {
    if (!headRef.current) return;

    const delay = index * 0.045;

    const raw = THREE.MathUtils.clamp(
      (progress - 0.05 - delay) / 0.72,
      0,
      1
    );

    const movement = ease(raw);

    const destination = lerpPoint(
      start,
      target,
      movement
    );

    /*
      Smooth movement.
    */
    current.current.lerp(
      destination,
      Math.min(1, delta * 14)
    );

    headRef.current.position.copy(current.current);

    /*
      Direction of travel.
    */
    const direction = new THREE.Vector3()
      .subVectors(
        new THREE.Vector3(...target),
        new THREE.Vector3(...start)
      )
      .normalize();

    /*
      Create a shooting-star trail behind the head.
      Each segment is progressively farther behind.
    */
    const trailLength = 0.48;

    for (let i = 0; i < 6; i++) {
      const line = trailRefs.current[i];

      if (!line) continue;

      const frontDistance =
        (i / 6) * trailLength;

      const backDistance =
        ((i + 1) / 6) * trailLength;

      const front = current.current
        .clone()
        .sub(
          direction.clone().multiplyScalar(frontDistance)
        );

      const back = current.current
        .clone()
        .sub(
          direction.clone().multiplyScalar(backDistance)
        );

      line.geometry.setFromPoints([
        front,
        back,
      ]);

      /*
        Bright near the head.
        Fades toward the tail.
      */
      const fade =
        (1 - i / 6) *
        THREE.MathUtils.smoothstep(
          raw,
          0.01,
          0.12
        ) *
        (
          1 -
          THREE.MathUtils.smoothstep(
            progress,
            0.84,
            0.96
          )
        );

      line.material.opacity = fade;
    }

    /*
      Tiny point of light at the front.
      This is NOT a sphere.
    */
    const headFade =
      THREE.MathUtils.smoothstep(
        raw,
        0.01,
        0.1
      ) *
      (
        1 -
        THREE.MathUtils.smoothstep(
          progress,
          0.84,
          0.96
        )
      );

    headRef.current.material.opacity = headFade;

    /*
      Completely disappear after reaching the
      navigation area.
    */
    headRef.current.visible =
      headFade > 0.01;

    trailRefs.current.forEach((line) => {
      if (line) {
        line.visible = headFade > 0.01;
      }
    });
  });

  return (
    <group>
      {/* Tiny white light point */}
      <points
        ref={headRef}
        renderOrder={100}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={1}
            array={new Float32Array([0, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>

        <pointsMaterial
          color="#ffffff"
          size={0.075}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
        />
      </points>

      {/* Shooting-star trail */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          renderOrder={99}
        >
          <bufferGeometry />
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
          />
        </line>
      ))}
    </group>
  );
}

export default function GlobeFragments({
  progress,
}) {
  return (
    <group>
      {starts.map((_, index) => (
        <FallingStar
          key={index}
          index={index}
          progress={progress}
        />
      ))}
    </group>
  );
}