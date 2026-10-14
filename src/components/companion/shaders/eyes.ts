/**
 * Pip's eyes as 2D signed distance fields, evaluated on the orb's front face.
 *
 * The face is parameterised by the *undisplaced* object-space direction (orthographic
 * projection of the unit sphere), so the eyes stay glued to the body while it wobbles
 * and turn with it. Shapes blend linearly by weight:
 *   uEyeA = (capsule, narrow, happy)   uEyeB = (wide, cross, closed)
 */
export const eyesChunk = /* glsl */ `
uniform vec3 uEyeA;
uniform vec3 uEyeB;
uniform float uEyeOpen;
uniform vec2 uGaze;
uniform float uFaceTilt;
uniform float uGlitch;

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

/* Upper half-ring with round caps: an "∩" arc (happy ^ eyes). */
float sdArcUp(vec2 p, float R, float t) {
  if (p.y >= 0.0) return abs(length(p) - R) - t;
  return min(length(p - vec2(R, 0.0)), length(p + vec2(R, 0.0))) - t;
}

float eyeShape(vec2 q, float side) {
  float open = max(uEyeOpen, 0.07);
  vec2 qo = vec2(q.x, q.y / open);

  float dCapsule = sdRoundBox(qo, vec2(0.05, 0.085), 0.05) * min(open, 1.0);
  vec2 qn = rot2(side * 0.2) * q;
  float dNarrow = sdRoundBox(vec2(qn.x, qn.y / max(open, 0.35)), vec2(0.068, 0.024), 0.024);
  float dHappy = sdArcUp(q + vec2(0.0, 0.035), 0.06, 0.02);
  float dWide = (length(qo) - 0.076) * min(open, 1.0);
  float dCross = min(
    sdSegment(q, vec2(-0.05, -0.05), vec2(0.05, 0.05)),
    sdSegment(q, vec2(-0.05, 0.05), vec2(0.05, -0.05))
  ) - 0.017;
  float dClosed = sdArcUp(vec2(q.x, -(q.y + 0.02)), 0.055, 0.013);

  return dot(uEyeA, vec3(dCapsule, dNarrow, dHappy)) + dot(uEyeB, vec3(dWide, dCross, dClosed));
}

float hash11(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

/* Returns (coverage, glow) for a unit object-space direction. */
vec2 pipEyes(vec3 dir, float time) {
  if (dir.z < 0.0) return vec2(0.0);
  vec2 uv = rot2(uFaceTilt) * dir.xy;

  // Transition glitch: horizontal slice jitter + flicker.
  float row = floor(uv.y * 26.0);
  uv.x += (hash11(row + floor(time * 40.0) * 7.31) - 0.5) * 0.07 * uGlitch;

  // Eye-local space is scaled by EYE_SCALE so shape constants stay readable.
  const float EYE_SCALE = 1.3;
  vec2 c = vec2(uGaze.x * 0.22, 0.06 + uGaze.y * 0.16);
  float dl = eyeShape((uv - (c + vec2(-0.215, 0.0))) / EYE_SCALE, -1.0) * EYE_SCALE;
  float dr = eyeShape((uv - (c + vec2(0.215, 0.0))) / EYE_SCALE, 1.0) * EYE_SCALE;
  float d = min(dl, dr);

  float aa = max(fwidth(d), 1e-4) * 1.25;
  float cover = 1.0 - smoothstep(-aa, aa, d);
  float glow = exp(-max(d, 0.0) * 30.0);

  float flicker = step(0.35, hash11(floor(time * 50.0)));
  float f = mix(1.0, flicker, uGlitch);
  float facing = smoothstep(0.08, 0.3, dir.z);
  return vec2(cover, glow) * f * facing;
}
`;
