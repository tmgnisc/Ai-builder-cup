"use client";

import { useEffect, useMemo, type RefObject } from "react";
import { AdditiveBlending, MeshBasicMaterial, SphereGeometry, TorusGeometry, type Group } from "three";

export function createHaloMaterials() {
  const make = () =>
    new MeshBasicMaterial({ transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  return { ring: make(), bead: make() };
}

/**
 * Thin orbiting ring with a small "satellite" bead. Opacity, radius, spin and colour
 * are driven per-frame by the scene via the materials and refs it passes in.
 */
export function PipHalo({
  groupRef,
  spinRef,
  materials,
}: {
  groupRef: RefObject<Group | null>;
  spinRef: RefObject<Group | null>;
  materials: ReturnType<typeof createHaloMaterials>;
}) {
  const geo = useMemo(() => ({ ring: new TorusGeometry(1, 0.009, 8, 160), bead: new SphereGeometry(0.045, 16, 16) }), []);

  useEffect(
    () => () => {
      geo.ring.dispose();
      geo.bead.dispose();
    },
    [geo],
  );

  return (
    <group ref={groupRef} rotation={[1.15, 0.2, 0.25]} visible={false}>
      <group ref={spinRef}>
        <mesh geometry={geo.ring} material={materials.ring} />
        <mesh geometry={geo.bead} material={materials.bead} position={[1, 0, 0]} />
      </group>
    </group>
  );
}
