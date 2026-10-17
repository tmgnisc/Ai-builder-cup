/**
 * Try-on rig: pure geometry that maps garment parts (see garmentArt.ts) onto MediaPipe pose landmarks.
 * No DOM or MediaPipe here, so it is unit-testable; the studio turns placements into canvas draws.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Landmark extends Pt {
  visibility?: number;
}

/** MediaPipe Pose landmark indices used by the rig. */
export const LM = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
} as const;

/** A part drawn with an affine map: image (0,0) lands on `origin`, its x/y axes on `ax`/`ay` (px per image unit). */
export interface Placement {
  part: "torso" | "sleeveUpper" | "sleeveLower" | "head" | "eyes" | "shawl";
  origin: Pt;
  ax: Pt;
  ay: Pt;
  /** Source image size in art units. */
  w: number;
  h: number;
}

export type RigKind = "top" | "outerwear" | "headwear" | "eyewear" | "shawl";

export interface RigOptions {
  kind: RigKind;
  hasUpper: boolean;
  hasLower: boolean;
  sleeveReach: number;
  length: number;
  /** Headwear only: crown-worn caps (e.g. a Dhaka topi) sit higher on the head than a brimmed cap. */
  crown?: boolean;
}

export type RigStatus = "ok" | "no-person" | "need-shoulders" | "need-face";

const VISIBLE = 0.5;
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
const vis = (l: Landmark | undefined) => !!l && (l.visibility ?? 1) >= VISIBLE;

/** Landmarks in canvas pixels; `mirror` flips x to match a selfie-mirrored video. */
export function toCanvas(lms: Landmark[], width: number, height: number, mirror: boolean): Landmark[] {
  return lms.map((l) => ({ x: (mirror ? 1 - l.x : l.x) * width, y: l.y * height, visibility: l.visibility }));
}

/** Exponential smoothing against the previous frame, to stop the garment jittering. */
export function smooth(prev: Landmark[] | null, next: Landmark[], alpha = 0.45, resetPx = 120): Landmark[] {
  if (!prev || prev.length !== next.length) return next;
  return next.map((n, i) => {
    const p = prev[i];
    if (Math.hypot(n.x - p.x, n.y - p.y) > resetPx) return n;
    return { x: p.x + (n.x - p.x) * alpha, y: p.y + (n.y - p.y) * alpha, visibility: n.visibility };
  });
}

/** Image box `w×h` mapped so that its top-centre sits at `start` and bottom-centre at `end`, `width` px wide. */
function alongBone(part: Placement["part"], start: Pt, end: Pt, width: number, w: number, h: number): Placement {
  const v = sub(end, start);
  const along = unit(v);
  const across: Pt = { x: -along.y, y: along.x };
  return {
    part,
    origin: sub(start, mul(across, width / 2)),
    ax: mul(across, width / w),
    ay: mul(along, len(v) / h),
    w,
    h,
  };
}

/**
 * Where each garment part goes for this frame. Returns placements in draw order
 * (upper sleeves under the torso, forearms over it) plus a status for on-screen guidance.
 */
export function rig(lm: Landmark[], opt: RigOptions): { status: RigStatus; placements: Placement[] } {
  if (lm.length < 25) return { status: "no-person", placements: [] };

  if (opt.kind === "eyewear" || opt.kind === "headwear") {
    const [le, re] = [lm[LM.leftEye], lm[LM.rightEye]];
    if (!vis(le) || !vis(re)) return { status: "need-face", placements: [] };
    const eyes = [le, re].sort((a, b) => a.x - b.x);
    const eyeVec = sub(eyes[1], eyes[0]);
    const across = unit(eyeVec);
    let up: Pt = { x: across.y, y: -across.x };
    if (up.y > 0) up = mul(up, -1);

    if (opt.kind === "eyewear") {
      const width = len(eyeVec) * 2.45;
      const k = width / 220;
      const c = mid(eyes[0], eyes[1]);
      // Art centre (110, 34) sits between the eyes.
      const origin = sub(sub(c, mul(across, 110 * k)), mul(mul(up, -1), 34 * k));
      return { status: "ok", placements: [{ part: "eyes", origin, ax: mul(across, k), ay: mul(up, -k), w: 220, h: 80 }] };
    }

    const [la, ra] = [lm[LM.leftEar], lm[LM.rightEar]];
    // Head width: ear landmarks can sit close together (hair, turned head), so never go below the
    // typical ratio to eye spacing.
    const eyeSpan = len(eyeVec);
    const head = Math.max(vis(la) && vis(ra) ? len(sub(ra, la)) : 0, eyeSpan * 2.3);
    const width = head * (opt.crown ? 1.3 : 1.5);
    const k = width / 200;
    // Bottom-centre of the art (100, 120) rests on the brow (cap) or the hairline (crown-worn topi).
    const brow = add(mid(eyes[0], eyes[1]), mul(up, head * (opt.crown ? 0.48 : 0.3)));
    const origin = add(sub(brow, mul(across, 100 * k)), mul(up, 120 * k));
    return { status: "ok", placements: [{ part: "head", origin, ax: mul(across, k), ay: mul(up, -k), w: 200, h: 120 }] };
  }

  const ls = lm[LM.leftShoulder];
  const rs = lm[LM.rightShoulder];
  if (!vis(ls) || !vis(rs)) return { status: "need-shoulders", placements: [] };

  // Sides sorted by screen x so the left-hand sleeve follows the left-hand arm, mirrored or not.
  const sides = [
    { s: ls, e: lm[LM.leftElbow], w: lm[LM.leftWrist], h: lm[LM.leftHip] },
    { s: rs, e: lm[LM.rightElbow], w: lm[LM.rightWrist], h: lm[LM.rightHip] },
  ].sort((a, b) => a.s.x - b.s.x);
  const [L, R] = sides;
  const sw = len(sub(R.s, L.s));
  const across = unit(sub(R.s, L.s));
  let down: Pt = { x: -across.y, y: across.x };
  if (down.y < 0) down = mul(down, -1);
  const shoulderMid = mid(L.s, R.s);
  const torsoLen = vis(L.h) && vis(R.h) ? len(sub(mid(L.h, R.h), shoulderMid)) : sw * 1.45;

  const placements: Placement[] = [];

  if (opt.kind === "shawl") {
    const width = sw * 1.5;
    const kx = width / 220;
    const ky = (torsoLen * 1.05) / 240;
    const origin = sub(sub(shoulderMid, mul(across, width / 2)), mul(down, 20 * ky));
    placements.push({ part: "shawl", origin, ax: mul(across, kx), ay: mul(down, ky), w: 220, h: 260 });
    return { status: "ok", placements };
  }

  const sleeves: Placement[] = [];
  const forearms: Placement[] = [];
  if (opt.hasUpper) {
    for (const [side, out] of [
      [L, -1],
      [R, 1],
    ] as const) {
      // Sleeves hang from the garment's shoulder edge, a little outside the joint.
      const start = add(side.s, mul(across, out * sw * 0.16));
      const elbow = vis(side.e) ? side.e : add(side.s, mul(down, sw * 0.95));
      const reach = opt.hasLower ? 1 : opt.sleeveReach;
      const end = add(start, mul(sub(elbow, start), reach));
      sleeves.push(alongBone("sleeveUpper", start, end, sw * 0.5, 100, 160));
      if (opt.hasLower) {
        const upperDir = unit(sub(elbow, start));
        const wrist = vis(side.w) ? side.w : add(elbow, mul(upperDir, len(sub(elbow, start)) * 0.95));
        forearms.push(alongBone("sleeveLower", elbow, wrist, sw * 0.38, 100, 160));
      }
    }
  }

  // Torso: art y=18 is the shoulder line (pose joints sit inside the real shoulder, so the garment is
  // wider than the joint span and its shoulder line slightly above the joints); y=240 is the hem.
  const width = sw * 1.5;
  const kx = width / 200;
  const shoulderLine = sub(shoulderMid, mul(down, sw * 0.06));
  const ky = (torsoLen * opt.length + sw * 0.06) / (240 - 18);
  const origin = sub(sub(shoulderLine, mul(across, width / 2)), mul(down, 18 * ky));
  placements.push(...sleeves, { part: "torso", origin, ax: mul(across, kx), ay: mul(down, ky), w: 200, h: 240 }, ...forearms);
  return { status: "ok", placements };
}
