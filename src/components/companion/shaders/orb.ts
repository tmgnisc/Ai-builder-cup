import { eyesChunk } from "./eyes";
import { simplexNoise3D } from "./noise";

/**
 * Pip's body: a unit sphere displaced by two octaves of simplex noise, with normals
 * re-derived from the displaced surface. Shading is fully custom: a dark glossy shell,
 * inner core glow, Fresnel rim in the state colour, thin-film iridescence and two
 * clear-coat highlights. Eyes are composited in the same pass.
 */

export const orbVertex = /* glsl */ `
uniform float uTime;
uniform float uNoiseAmp;
uniform float uNoiseFreq;
uniform float uNoiseSpeed;
uniform float uSquashY;
uniform float uSplit;

varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vDir;

${simplexNoise3D}

float displacement(vec3 n) {
  float t = uTime * uNoiseSpeed;
  float d = snoise(n * uNoiseFreq + vec3(0.0, t, t * 0.7)) * uNoiseAmp;
  d += snoise(n * uNoiseFreq * 1.9 + vec3(t * 1.3)) * uNoiseAmp * 0.22;
  // Comparing: opposing travelling bands on the left and right halves.
  d += uSplit * 0.06 * sin(n.y * 7.0 + uTime * 4.0 * sign(n.x)) * smoothstep(0.05, 0.5, abs(n.x));
  // Keep the face calmer so the eyes read clearly.
  d *= mix(1.0, 0.3, smoothstep(0.35, 0.9, n.z));
  return d;
}

vec3 displaced(vec3 n) {
  vec3 p = n * (1.0 + displacement(n));
  p.y *= uSquashY;
  p.xz *= inversesqrt(uSquashY);
  return p;
}

void main() {
  vec3 n = normalize(position);
  vec3 up = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(n, up));
  vec3 bitangent = cross(n, tangent);

  float e = 0.012;
  vec3 p = displaced(n);
  vec3 pt = displaced(normalize(n + tangent * e));
  vec3 pb = displaced(normalize(n + bitangent * e));
  vec3 nrm = normalize(cross(pt - p, pb - p));
  if (dot(nrm, n) < 0.0) nrm = -nrm;

  vDir = n;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * nrm);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const orbFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uRim;
uniform float uRimIntensity;
uniform float uCore;
uniform float uSaturation;

varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vDir;

${eyesChunk}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.3);

  // Values are linear; the sRGB output transform lifts them a lot, so keep the shell and core dark.
  vec3 shell = vec3(0.006, 0.007, 0.011);
  vec3 core = uRim * uCore * (0.015 + 0.09 * pow(ndv, 5.0));
  vec3 irid = 0.5 + 0.5 * cos(6.28318 * (fres * 0.9 + vec3(0.0, 0.33, 0.67)) + uTime * 0.15);

  vec3 L1 = normalize(vec3(-0.6, 0.75, 0.6));
  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 180.0);
  vec3 L2 = normalize(vec3(0.8, -0.25, 0.45));
  float s2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 48.0);

  vec3 col = shell + core
    + uRim * pow(fres, 1.4) * 1.35 * uRimIntensity
    + irid * fres * 0.1
    + vec3(s1 * 1.1 + s2 * 0.05);

  vec2 eye = pipEyes(normalize(vDir), uTime);
  vec3 eyeCol = mix(vec3(1.0), uRim, 0.06);
  col = mix(col, eyeCol, eye.x) + uRim * eye.y * 0.12 * max(uRimIntensity, 0.3);

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, uSaturation);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
