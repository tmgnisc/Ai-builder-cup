"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, SRGBColorSpace, type Group } from "three";
import { gsap } from "@/lib/motion";
import { useCompanion } from "@/store/useCompanion";
import { PipHalo, createHaloMaterials } from "./PipHalo";
import { PipOrb, createOrbUniforms } from "./PipOrb";
import { onPipReaction, pipRuntime, type Reaction } from "./runtime";
import { STATES, resolveParams, type PipParams, type PipState } from "./states";

const GLITCH_S = 0.12;
const POINTER_IDLE_MS = 4000;
const TAU = Math.PI * 2;

interface Fx {
  glitch: number;
  hopY: number;
  stretch: number;
  spin: number;
  shakeX: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const damp = (current: number, target: number, lambda: number, dt: number) => MathUtils.damp(current, target, lambda, dt);

/**
 * The brain of Pip's body. Two layers:
 *  1. `params`: tweened by GSAP between state configs (glitch first, then expo.out).
 *  2. useFrame: procedural life on top (blinks, gaze saccades, pointer follow, sway,
 *     darts, breathing, mic/speech reactivity) plus entrance FX (hop, spin, shake).
 */
export function PipScene({ reduced }: { reduced: boolean }) {
  const { invalidate, setDpr, viewport } = useThree();
  const uniforms = useMemo(createOrbUniforms, []);
  const halo = useMemo(createHaloMaterials, []);
  const params = useRef<PipParams>(resolveParams(useCompanion.getState().state)).current;
  const fx = useRef<Fx>({ glitch: 0, hopY: 0, stretch: 1, spin: 0, shakeX: 0 }).current;

  const body = useRef<Group>(null);
  const haloGroup = useRef<Group>(null);
  const haloSpin = useRef<Group>(null);

  const life = useRef({
    gx: 0,
    gy: 0,
    follow: 0,
    nextBlink: rand(2, 4),
    blinkStart: -1,
    nextSaccade: 0,
    sx: 0,
    sy: 0,
    mic: 0,
    talk: 0,
    dpr: 0,
    glitchCss: false,
  }).current;

  useEffect(() => {
    pipRuntime.invalidate = invalidate;
    return () => {
      pipRuntime.invalidate = null;
      halo.ring.dispose();
      halo.bead.dispose();
    };
  }, [invalidate, halo]);

  // ── Entrance / reaction FX ──
  useEffect(() => {
    const ctx = gsap.context(() => {});
    const play = (kind: Reaction | null) => {
      if (!kind || reduced) return;
      ctx.add(() => {
        if (kind === "shake") {
          gsap.to(fx, {
            keyframes: { shakeX: [0, 0.16, -0.13, 0.1, -0.06, 0.025, 0] },
            duration: 0.45,
            ease: "none",
            onUpdate: invalidate,
          });
          return;
        }
        const tl = gsap.timeline({ onUpdate: invalidate });
        tl.to(fx, { stretch: 0.86, duration: 0.09, ease: "power2.out" })
          .to(fx, { hopY: kind === "hop-spin" ? 0.45 : 0.36, stretch: 1.12, duration: 0.24, ease: "power2.out" })
          .to(fx, { hopY: 0, stretch: 1, duration: 0.26, ease: "power2.in" })
          .to(fx, { stretch: 0.88, duration: 0.07, ease: "power1.out" })
          .to(fx, { stretch: 1, duration: 0.5, ease: "back.out(3)" });
        if (kind === "hop-spin") {
          tl.to(
            fx,
            {
              spin: fx.spin + TAU,
              duration: 0.85,
              ease: "expo.out",
              onComplete: () => {
                fx.spin %= TAU;
              },
            },
            0.08,
          );
        }
      });
    };

    let tl: gsap.core.Timeline | null = null;
    const transition = (state: PipState) => {
      const def = STATES[state];
      const target = resolveParams(state);
      tl?.kill();
      if (reduced) {
        Object.assign(params, target);
        invalidate();
        return;
      }
      tl = gsap.timeline({ onUpdate: invalidate });
      tl.fromTo(fx, { glitch: 1 }, { glitch: 0, duration: GLITCH_S, ease: "none" }, 0);
      tl.to(params, { ...target, duration: def.duration, ease: "expo.out" }, GLITCH_S);
      play(def.entrance);
    };

    // Snap to the current state on mount; tween on every later change.
    Object.assign(params, resolveParams(useCompanion.getState().state));
    const unsubState = useCompanion.subscribe((s, prev) => {
      if (s.revision !== prev.revision) transition(s.state);
    });
    const unsubReact = onPipReaction(play);
    return () => {
      unsubState();
      unsubReact();
      tl?.kill();
      ctx.revert();
    };
  }, [reduced, params, fx, invalidate]);

  // ── Per-frame ──
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const now = performance.now();
    const P: PipParams = pipRuntime.override ? { ...params, ...pipRuntime.override } : params;
    const live = reduced ? 0 : 1;

    // DPR follows Pip's displayed size (rendering a shrunk 460px canvas at full DPR is waste).
    const deviceDpr = Math.min(window.devicePixelRatio || 1, 2);
    const wantDpr = Math.max(0.5, Math.round(deviceDpr * Math.min(1, pipRuntime.renderScale) * 4) / 4);
    if (wantDpr !== life.dpr) {
      life.dpr = wantDpr;
      setDpr(wantDpr);
    }

    // Gaze target: state base + saccadic drift + darting/alternating, then pointer & glance.
    if (t > life.nextSaccade) {
      life.sx = rand(-0.45, 0.45);
      life.sy = rand(-0.25, 0.25);
      life.nextSaccade = t + rand(1.2, 3.4);
    }
    let gx = P.gazeX + live * P.drift * life.sx;
    let gy = P.gazeY + live * P.drift * life.sy;
    const swayPhase = Math.sin(t * P.swayRate);
    gx += live * P.dartAmp * Math.tanh(Math.sin(t * P.swayRate + 0.4) * 5);
    gx += live * P.alternateAmp * Math.tanh(Math.sin(t * 2.2) * 6);

    const pointerActive = !reduced && now - pipRuntime.pointer.t < POINTER_IDLE_MS ? 1 : 0;
    life.follow = damp(life.follow, pointerActive * P.follow, 4, dt);
    if (life.follow > 0.001 && pipRuntime.displaySize > 0) {
      const px = MathUtils.clamp((pipRuntime.pointer.x - pipRuntime.center.x) / (window.innerWidth * 0.45), -1, 1);
      const py = MathUtils.clamp(-(pipRuntime.pointer.y - pipRuntime.center.y) / (window.innerHeight * 0.45), -1, 1);
      gx = MathUtils.lerp(gx, px * 0.85, life.follow);
      gy = MathUtils.lerp(gy, py * 0.7, life.follow);
    }
    const glance = pipRuntime.glance;
    if (glance && now < glance.until) {
      gx = MathUtils.clamp((glance.x - pipRuntime.center.x) / (window.innerWidth * 0.4), -1, 1) * 0.9;
      gy = MathUtils.clamp(-(glance.y - pipRuntime.center.y) / (window.innerHeight * 0.4), -1, 1) * 0.75;
    } else if (glance) {
      pipRuntime.glance = null;
    }
    life.gx = reduced ? gx : damp(life.gx, gx, 14, dt);
    life.gy = reduced ? gy : damp(life.gy, gy, 14, dt);

    // Blinks every 3–6 s, sometimes doubled.
    let blinkMul = 1;
    if (live && P.blink > 0.01) {
      if (t > life.nextBlink) {
        life.blinkStart = t;
        life.nextBlink = t + (Math.random() < 0.18 ? 0.28 : rand(3, 6));
      }
      const k = (t - life.blinkStart) / 0.16;
      if (k >= 0 && k <= 1) blinkMul = MathUtils.lerp(1, 1 - Math.sin(Math.PI * k), P.blink);
    }

    // Mic & speech envelopes.
    life.mic = damp(life.mic, pipRuntime.micLevel, 18, dt);
    const speechFresh = now - pipRuntime.speechAt < 250;
    const simulated = Math.max(0, Math.sin(t * 11.3) * Math.sin(t * 3.1 + 1.7)) ** 1.4;
    life.talk = damp(life.talk, live * P.talk * (speechFresh ? pipRuntime.speechLevel : simulated), 20, dt);

    const breath = live * Math.sin(t * P.breathRate * Math.PI) * P.breathAmp;
    const pulse = 1 + live * Math.sin(t * P.pulseRate * Math.PI) * P.pulseAmp;
    const mic = live * P.micReactive * life.mic;

    // ── Uniforms ──
    const u = uniforms;
    u.uTime.value = live ? t : 0;
    u.uNoiseAmp.value = P.noiseAmplitude + mic * 0.22 + life.talk * 0.05;
    u.uNoiseFreq.value = P.noiseFrequency;
    u.uNoiseSpeed.value = P.noiseSpeed;
    u.uSquashY.value = P.squashY;
    u.uSplit.value = P.split;
    u.uRim.value.setRGB(P.rimR, P.rimG, P.rimB, SRGBColorSpace);
    u.uRimIntensity.value = P.rimIntensity * (0.85 + 0.15 * pulse);
    u.uCore.value = P.coreIntensity * pulse + mic * 0.5 + life.talk * 0.35;
    u.uSaturation.value = P.saturation;
    u.uEyeA.value.set(P.eyeCapsule, P.eyeNarrow, P.eyeHappy);
    u.uEyeB.value.set(P.eyeWide, P.eyeCross, P.eyeClosed);
    u.uEyeOpen.value = P.eyeOpenness * blinkMul;
    u.uGaze.value.set(life.gx, life.gy);
    u.uFaceTilt.value = P.faceTilt;
    u.uGlitch.value = fx.glitch;

    // ── Body pose ──
    const b = body.current;
    if (b) {
      const sway = live * swayPhase * P.swayAmp;
      b.position.set(P.offsetX + sway * 0.5 + fx.shakeX, P.offsetY + fx.hopY, 0);
      b.rotation.set(P.leanX - life.gy * 0.16, P.leanY + life.gx * 0.3 + fx.spin, P.leanZ + sway * 0.6 - fx.shakeX * 0.6);
      const s = P.scale * (1 + breath) * (1 + life.talk * 0.05 + mic * 0.04);
      const st = fx.stretch;
      b.scale.set(s / Math.sqrt(st), s * st, s / Math.sqrt(st));
    }

    // ── Halo ──
    const hg = haloGroup.current;
    if (hg && haloSpin.current) {
      hg.visible = P.haloOpacity > 0.01;
      hg.scale.setScalar(P.haloRadius);
      haloSpin.current.rotation.z += dt * P.haloSpeed * live;
      halo.ring.opacity = P.haloOpacity * 0.85;
      halo.bead.opacity = P.haloOpacity;
      halo.ring.color.setRGB(P.rimR, P.rimG, P.rimB, SRGBColorSpace);
      halo.bead.color.copy(halo.ring.color);
    }

    // ── CSS RGB split during the transition glitch (cheap stand-in for chromatic aberration) ──
    const el = pipRuntime.glitchEl;
    const glitching = fx.glitch > 0.02;
    if (el && glitching !== life.glitchCss) {
      life.glitchCss = glitching;
      el.style.filter = glitching
        ? "drop-shadow(3px 0 0 rgb(255 40 90 / 0.75)) drop-shadow(-3px 0 0 rgb(40 220 255 / 0.75))"
        : "";
    }
  });

  // Keep the composition framed regardless of canvas aspect (it is always square, but be safe).
  const fit = Math.min(1, viewport.width / 3.9);

  return (
    <group scale={fit}>
      <group ref={body}>
        <PipOrb uniforms={uniforms} />
        <PipHalo groupRef={haloGroup} spinRef={haloSpin} materials={halo} />
      </group>
    </group>
  );
}
