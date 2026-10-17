import { describe, expect, it } from "vitest";
import { LM, rig, smooth, toCanvas, type Landmark, type Placement } from "./rig";

/** A front-facing person, arms hanging, in canvas pixels. */
function person(over: Partial<Record<keyof typeof LM, Landmark>> = {}): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const set = (k: keyof typeof LM, x: number, y: number, visibility = 0.99) => (lm[LM[k]] = { x, y, visibility });
  set("nose", 320, 120);
  set("leftEye", 340, 105);
  set("rightEye", 300, 105);
  set("leftEar", 365, 115);
  set("rightEar", 275, 115);
  set("leftShoulder", 400, 220);
  set("rightShoulder", 240, 220);
  set("leftElbow", 420, 330);
  set("rightElbow", 220, 330);
  set("leftWrist", 425, 430);
  set("rightWrist", 215, 430);
  set("leftHip", 380, 450);
  set("rightHip", 260, 450);
  for (const [k, v] of Object.entries(over)) lm[LM[k as keyof typeof LM]] = v!;
  return lm;
}

const at = (p: Placement, ix: number, iy: number) => ({
  x: p.origin.x + p.ax.x * ix + p.ay.x * iy,
  y: p.origin.y + p.ax.y * ix + p.ay.y * iy,
});
const TOP = { kind: "top" as const, hasUpper: true, hasLower: true, sleeveReach: 0.55, length: 1.12 };

describe("try-on rig", () => {
  it("centres the torso, its shoulder line just above the joints and its hem at length × torso", () => {
    const { status, placements } = rig(person(), TOP);
    expect(status).toBe("ok");
    const torso = placements.find((p) => p.part === "torso")!;
    const shoulderLine = at(torso, 100, 18);
    const sw = 160;
    expect(shoulderLine.x).toBeCloseTo(320, 0);
    expect(shoulderLine.y).toBeCloseTo(220 - sw * 0.06, 0);
    // Hem at 1.12 × shoulder→hip (230 px) below the shoulders, and 1.5× the joint span wide.
    expect(at(torso, 100, 240).y).toBeCloseTo(220 + 230 * 1.12, 0);
    expect(at(torso, 200, 18).x - at(torso, 0, 18).x).toBeCloseTo(sw * 1.5, 0);
  });

  it("draws upper sleeves under the torso and forearms over it, each ending on the joints", () => {
    const { placements } = rig(person(), TOP);
    expect(placements.map((p) => p.part)).toEqual(["sleeveUpper", "sleeveUpper", "torso", "sleeveLower", "sleeveLower"]);
    const forearm = placements[3];
    const end = at(forearm, 50, 160);
    expect(end.x).toBeCloseTo(215, 0); // screen-left wrist
    expect(end.y).toBeCloseTo(430, 0);
  });

  it("short sleeves stop part-way down the upper arm", () => {
    const { placements } = rig(person(), { ...TOP, hasLower: false });
    expect(placements.filter((p) => p.part === "sleeveLower")).toHaveLength(0);
    const sleeve = placements[0];
    expect(at(sleeve, 50, 160).y).toBeLessThan(330);
  });

  it("assumes hanging arms and a typical torso when elbows and hips are out of frame", () => {
    const hidden = { x: 0, y: 0, visibility: 0.1 };
    const { status, placements } = rig(person({ leftElbow: hidden, rightElbow: hidden, leftHip: hidden, rightHip: hidden }), TOP);
    expect(status).toBe("ok");
    expect(placements.find((p) => p.part === "torso")).toBeDefined();
  });

  it("asks the shopper to step back when shoulders are not visible", () => {
    const hidden = { x: 0, y: 0, visibility: 0.1 };
    expect(rig(person({ leftShoulder: hidden }), TOP).status).toBe("need-shoulders");
    expect(rig([], TOP).status).toBe("no-person");
  });

  it("centres eyewear between the eyes and headwear above them", () => {
    const glasses = rig(person(), { ...TOP, kind: "eyewear" }).placements[0];
    const c = at(glasses, 110, 34);
    expect(c.x).toBeCloseTo(320, 0);
    expect(c.y).toBeCloseTo(105, 0);
    const cap = rig(person(), { ...TOP, kind: "headwear" }).placements[0];
    expect(at(cap, 100, 120).y).toBeLessThan(105);
  });

  it("mirrors landmarks for the selfie view and smooths small jitter only", () => {
    const [p] = toCanvas([{ x: 0.25, y: 0.5 }], 640, 480, true);
    expect(p).toMatchObject({ x: 480, y: 240 });
    const prev = [{ x: 100, y: 100 }];
    expect(smooth(prev, [{ x: 110, y: 100 }])[0].x).toBeCloseTo(104.5);
    expect(smooth(prev, [{ x: 400, y: 100 }])[0].x).toBe(400);
  });
});
