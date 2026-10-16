"use client";

import { useEffect, useMemo, type RefObject } from "react";
import { Color, IcosahedronGeometry, ShaderMaterial, Vector2, Vector3, type Mesh } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { orbFragment, orbVertex } from "./shaders/orb";

export interface OrbUniforms {
  uTime: { value: number };
  uNoiseAmp: { value: number };
  uNoiseFreq: { value: number };
  uNoiseSpeed: { value: number };
  uSquashY: { value: number };
  uSplit: { value: number };
  uRim: { value: Color };
  uRimIntensity: { value: number };
  uCore: { value: number };
  uSaturation: { value: number };
  uEyeA: { value: Vector3 };
  uEyeB: { value: Vector3 };
  uEyeOpen: { value: number };
  uGaze: { value: Vector2 };
  uFaceTilt: { value: number };
  uGlitch: { value: number };
}

import { tokens } from "@/styles/tokens";

export function createOrbUniforms(): OrbUniforms {
  return {
    uTime: { value: 0 },
    uNoiseAmp: { value: 0.035 },
    uNoiseFreq: { value: 1.4 },
    uNoiseSpeed: { value: 0.25 },
    uSquashY: { value: 1 },
    uSplit: { value: 0 },
    uRim: { value: new Color(tokens.colors.dark.accent) },
    uRimIntensity: { value: 0.75 },
    uCore: { value: 0.4 },
    uSaturation: { value: 1 },
    uEyeA: { value: new Vector3(1, 0, 0) },
    uEyeB: { value: new Vector3(0, 0, 0) },
    uEyeOpen: { value: 1 },
    uGaze: { value: new Vector2(0, 0) },
    uFaceTilt: { value: 0 },
    uGlitch: { value: 0 },
  };
}

interface PipOrbProps {
  uniforms: OrbUniforms;
  meshRef?: RefObject<Mesh | null>;
  /** Icosahedron subdivision. Merged to an indexed mesh so the vertex shader runs once per unique vertex. */
  detail?: number;
}

export function PipOrb({ uniforms, meshRef, detail = 64 }: PipOrbProps) {
  const geometry = useMemo(() => {
    const ico = new IcosahedronGeometry(1, detail);
    ico.deleteAttribute("normal");
    ico.deleteAttribute("uv");
    const merged = mergeVertices(ico, 1e-5);
    ico.dispose();
    return merged;
  }, [detail]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: orbVertex,
        fragmentShader: orbFragment,
        uniforms: uniforms as unknown as Record<string, { value: unknown }>,
      }),
    [uniforms],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
