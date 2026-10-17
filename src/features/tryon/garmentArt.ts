import type { Product } from "@/lib/commerce/schemas";

/**
 * Garment art as SVG parts, shared by the product packshot (flat-lay) and the live try-on rig.
 *
 * Every part is drawn in its own fixed coordinate box with known attachment points, so the try-on can
 * map it onto body landmarks:
 *  - torso   200×240: top edge = shoulder line (outer shoulders at x 0 / 200), bottom edge = hem
 *  - sleeve  100×160: top-centre (50,0) attaches to the start joint, bottom-centre (50,160) to the end joint
 *  - head    200×120: bottom-centre (100,120) sits on the brow line, width = head width
 *  - eyes    220×80:  centre (110,40) sits between the eyes, width ≈ 2.4 × eye distance
 *  - shawl   220×260: top edge = shoulder line, drapes down the chest
 * Colours come from the product's catalog colour options, never from theme tokens.
 */

export type GarmentProduct = Pick<Product, "id" | "name" | "tags" | "palette"> & { specs: Product["specs"] };

export interface GarmentParts {
  kind: NonNullable<Product["specs"]["garment"]>;
  torso?: string;
  sleeveUpper?: string;
  sleeveLower?: string;
  /** Short sleeves cover this fraction of the upper arm. */
  sleeveReach: number;
  head?: string;
  eyes?: string;
  shawl?: string;
  /** Hem position as a multiple of the shoulder→hip distance. */
  length: number;
}

// ── colour helpers ──
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
export const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const WHITE = "#ffffff";
const BLACK = "#000000";

export function defaultColor(p: GarmentProduct): string {
  return p.specs.colors?.[0]?.hex ?? p.palette[0];
}

const has = (p: GarmentProduct, ...tags: string[]) => tags.some((t) => p.tags.includes(t));

interface Paint {
  id: string;
  base: string;
  hi: string;
  lo: string;
  line: string;
  accent: string;
}

function paintFor(p: GarmentProduct, color: string, uid: string): Paint {
  const light = lum(color) > 0.6;
  return {
    id: `${uid}-${p.id}`.replace(/[^a-zA-Z0-9-]/g, ""),
    base: color,
    hi: mix(color, WHITE, light ? 0.35 : 0.18),
    lo: mix(color, BLACK, light ? 0.18 : 0.35),
    line: mix(color, BLACK, light ? 0.3 : 0.5),
    accent: p.palette[1],
  };
}

/** Fabric fill: shading gradient plus the garment's pattern. */
function fabricDefs(p: GarmentProduct, k: Paint): string {
  const pattern = p.specs.pattern ?? "solid";
  let overlay = "";
  if (pattern === "check") {
    const dark = mix(k.base, BLACK, 0.55);
    overlay = `<pattern id="${k.id}-pat" width="28" height="28" patternUnits="userSpaceOnUse">
      <rect width="28" height="28" fill="${k.base}"/>
      <rect width="12" height="28" fill="${dark}" opacity="0.55"/><rect width="28" height="12" fill="${dark}" opacity="0.55"/>
      <rect x="20" width="2" height="28" fill="${WHITE}" opacity="0.25"/><rect y="20" width="28" height="2" fill="${WHITE}" opacity="0.25"/></pattern>`;
  } else if (pattern === "stripe") {
    overlay = `<pattern id="${k.id}-pat" width="40" height="30" patternUnits="userSpaceOnUse">
      <rect width="40" height="30" fill="${k.base}"/><rect width="40" height="10" fill="${k.hi}" opacity="0.55"/>
      <rect y="28" width="40" height="2" fill="${k.line}" opacity="0.8"/></pattern>`;
  } else if (pattern === "dhaka") {
    const [red, orange] = [k.base, "#e0a43a"];
    overlay = `<pattern id="${k.id}-pat" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="${red}"/>
      <path d="M12 2 22 12 12 22 2 12Z" fill="${orange}"/><path d="M12 7 17 12 12 17 7 12Z" fill="#1c1a22"/>
      <path d="M12 10 14 12 12 14 10 12Z" fill="${WHITE}"/><path d="M0 0h4v4H0zM20 20h4v4h-4z" fill="#1c1a22"/></pattern>`;
  }
  return `<defs>${overlay}
    <linearGradient id="${k.id}-shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BLACK}" stop-opacity="0.28"/><stop offset="0.2" stop-color="${BLACK}" stop-opacity="0"/>
      <stop offset="0.8" stop-color="${BLACK}" stop-opacity="0"/><stop offset="1" stop-color="${BLACK}" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="${k.id}-light" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${WHITE}" stop-opacity="0.16"/><stop offset="1" stop-color="${BLACK}" stop-opacity="0.14"/>
    </linearGradient></defs>`;
}

const fill = (p: GarmentProduct, k: Paint) => ((p.specs.pattern ?? "solid") === "solid" ? k.base : `url(#${k.id}-pat)`);
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${body}</svg>`;

// ── Torso ──
function torso(p: GarmentProduct, k: Paint): string {
  const outer = p.specs.garment === "outerwear";
  // Rounded, sloping shoulders (square corners read as a cardboard box on camera).
  const shape = "M2 44 C0 30 8 20 22 15 C40 8 56 3 70 0 C80 16 120 16 130 0 C144 3 160 8 178 15 C192 20 200 30 198 44 L196 240 L4 240 Z";
  let details = "";
  const stitch = `stroke="${k.line}" stroke-width="1.5" fill="none"`;
  if (has(p, "tee")) details += `<path d="M70 0 C80 18 120 18 130 0" stroke="${k.lo}" stroke-width="7" fill="none"/>`;
  if (has(p, "polo")) {
    details += `<path d="M70 0 L86 30 L100 12 L114 30 L130 0" fill="${k.hi}" stroke="${k.line}" stroke-width="1.5"/>
      <rect x="95" y="12" width="10" height="44" fill="${k.lo}" opacity="0.6"/>
      <circle cx="100" cy="28" r="2.6" fill="${k.hi}"/><circle cx="100" cy="44" r="2.6" fill="${k.hi}"/>`;
  }
  if (has(p, "shirt") && !has(p, "polo")) {
    details += `<path d="M70 0 L84 34 L100 14 L116 34 L130 0" fill="${k.hi}" stroke="${k.line}" stroke-width="1.5"/>
      <path d="M100 14 V240" ${stitch}/>
      ${[40, 80, 120, 160, 200].map((y) => `<circle cx="104" cy="${y}" r="2.6" fill="${k.hi}" stroke="${k.line}"/>`).join("")}
      <path d="M40 60 h34 v30 h-34 z" ${stitch} opacity="0.7"/>`;
  }
  if (has(p, "kurta")) {
    details += `<path d="M76 2 C84 14 116 14 124 2 L124 10 C114 22 86 22 76 10 Z" fill="${k.lo}"/>
      <path d="M100 16 V96" ${stitch}/>${[34, 56, 78].map((y) => `<circle cx="100" cy="${y}" r="2.6" fill="${k.accent}"/>`).join("")}`;
  }
  if (has(p, "hoodie")) {
    details += `<path d="M58 2 C70 30 130 30 142 2 C130 18 70 18 58 2Z" fill="${k.lo}"/>
      <path d="M100 22 V240" stroke="${k.line}" stroke-width="3"/><path d="M58 150 h84 l10 60 h-104 z" fill="${k.lo}" opacity="0.5"/>
      <path d="M92 30 v26 M108 30 v26" stroke="${k.hi}" stroke-width="2"/>`;
  }
  if (has(p, "denim")) {
    const st = `stroke="${k.accent}" stroke-width="1.6" stroke-dasharray="4 3" fill="none"`;
    details += `<path d="M70 0 L82 28 L100 16 L118 28 L130 0" fill="${k.lo}" stroke="${k.line}" stroke-width="1.5"/>
      <path d="M100 16 V200" ${st}/><path d="M30 64 h46 v34 h-46z M124 64 h46 v34 h-46z" ${st}/>
      <path d="M4 200 H196" ${st}/>${[50, 90, 130, 170].map((y) => `<circle cx="104" cy="${y}" r="3" fill="${k.accent}"/>`).join("")}`;
  }
  if (has(p, "down")) {
    details += `<path d="M66 0 C80 20 120 20 134 0 L134 12 C120 30 80 30 66 12Z" fill="${k.lo}"/>
      <path d="M100 22 V240" stroke="${k.line}" stroke-width="3"/>`;
  }
  if (has(p, "flannel")) {
    details += `<path d="M70 0 L84 34 L100 14 L116 34 L130 0" fill="${k.lo}" stroke="${k.line}" stroke-width="1.5"/>
      <path d="M100 14 V240" ${stitch}/>${[50, 100, 150, 200].map((y) => `<circle cx="104" cy="${y}" r="2.6" fill="${k.hi}"/>`).join("")}`;
  }
  const hem = outer ? `<rect x="4" y="226" width="192" height="14" fill="${k.lo}" opacity="0.7"/>` : "";
  return svg(
    200,
    240,
    `${fabricDefs(p, k)}<path d="${shape}" fill="${fill(p, k)}"/><path d="${shape}" fill="url(#${k.id}-light)"/>
     <path d="${shape}" fill="url(#${k.id}-shade)"/>${hem}${details}`,
  );
}

// ── Sleeves ──
function sleeve(p: GarmentProduct, k: Paint, part: "upper" | "lower" | "short"): string {
  const cuff = part === "lower" || part === "short";
  // Upper and short sleeves get a rounded cap where they meet the shoulder.
  const shape =
    part === "upper"
      ? "M4 26 C4 8 24 0 50 0 C76 0 96 8 96 26 L90 160 H10 Z"
      : part === "lower"
        ? "M8 0 H92 L84 160 H16 Z"
        : "M2 26 C2 8 24 0 50 0 C76 0 98 8 98 26 L94 160 H6 Z";
  const band = cuff ? `<rect x="${part === "short" ? 6 : 16}" y="140" width="${part === "short" ? 88 : 68}" height="20" fill="${k.lo}" opacity="0.8"/>` : "";
  return svg(100, 160, `${fabricDefs(p, k)}<path d="${shape}" fill="${fill(p, k)}"/><path d="${shape}" fill="url(#${k.id}-shade)"/>${band}`);
}

// ── Headwear ──
function head(p: GarmentProduct, k: Paint): string {
  if (has(p, "topi")) {
    const shape = "M18 120 L30 34 C40 14 70 6 110 8 C150 10 172 22 178 40 L184 120 Z";
    return svg(200, 120, `${fabricDefs(p, k)}<path d="${shape}" fill="${fill(p, k)}"/><path d="${shape}" fill="url(#${k.id}-shade)"/>
      <path d="M18 112 H184" stroke="#1c1a22" stroke-width="10"/>`);
  }
  const crown = "M24 106 C24 40 62 8 100 8 C138 8 176 40 176 106 Z";
  return svg(
    200,
    120,
    `${fabricDefs(p, k)}<path d="${crown}" fill="${fill(p, k)}"/><path d="${crown}" fill="url(#${k.id}-shade)"/>
     <path d="M100 8 V106 M60 20 C70 50 72 80 70 106 M140 20 C130 50 128 80 130 106" stroke="${k.line}" stroke-width="1.5" fill="none" opacity="0.6"/>
     <circle cx="100" cy="10" r="5" fill="${k.lo}"/><path d="M14 104 C60 92 140 92 186 104 L190 118 C140 110 60 110 10 118 Z" fill="${k.lo}"/>`,
  );
}

// ── Eyewear ──
function eyes(_p: GarmentProduct, k: Paint): string {
  const lens = (cx: number) =>
    `<path d="M${cx - 44} 18 C${cx - 44} 10 ${cx + 44} 10 ${cx + 44} 18 C${cx + 44} 56 ${cx + 20} 74 ${cx} 74 C${cx - 26} 74 ${cx - 44} 52 ${cx - 44} 18Z" fill="${k.accent}" fill-opacity="0.82" stroke="${k.base}" stroke-width="4"/>`;
  return svg(
    220,
    80,
    `${lens(56)}${lens(164)}<path d="M100 22 C106 16 114 16 120 22" stroke="${k.base}" stroke-width="4" fill="none"/>
     <path d="M12 18 H208" stroke="${k.base}" stroke-width="3"/><path d="M30 26 L48 22" stroke="${WHITE}" stroke-opacity="0.5" stroke-width="3"/>
     <path d="M138 26 L156 22" stroke="${WHITE}" stroke-opacity="0.5" stroke-width="3"/>`,
  );
}

// ── Shawl ──
function shawl(p: GarmentProduct, k: Paint): string {
  const drape = "M0 20 C30 6 60 0 80 2 C90 40 130 40 140 2 C160 0 190 6 220 20 L200 260 L150 260 L130 70 C120 90 100 90 90 70 L70 260 L20 260 Z";
  const fringe = [20, 30, 40, 50, 60, 70, 150, 160, 170, 180, 190, 200].map((x) => `<path d="M${x} 252 v8" stroke="${k.lo}" stroke-width="2"/>`).join("");
  return svg(220, 260, `${fabricDefs(p, k)}<path d="${drape}" fill="${fill(p, k)}"/><path d="${drape}" fill="url(#${k.id}-light)"/>
    <path d="${drape}" fill="url(#${k.id}-shade)"/>${fringe}`);
}

/** Packshot of the shawl folded on a table (the on-body drape shape reads oddly flat). */
function foldedShawl(p: GarmentProduct, color: string, uid: string): string {
  const k = paintFor(p, color, `${uid}-fold`);
  const fringe = (x: number) =>
    Array.from({ length: 12 }, (_, i) => `<path d="M${x} ${88 + i * 11} h${x < 200 ? -12 : 12}" stroke="${k.lo}" stroke-width="2"/>`).join("");
  return `${fabricDefs(p, k)}
    <path d="M70 84 H330 V222 H70 Z" fill="${fill(p, k)}"/><path d="M70 84 H330 V222 H70 Z" fill="url(#${k.id}-light)"/>
    <path d="M70 146 H330 V168 H70 Z" fill="${k.lo}" opacity="0.45"/><path d="M70 152 H330" stroke="${k.hi}" stroke-opacity="0.5"/>
    <path d="M70 84 H330" stroke="${k.hi}" stroke-opacity="0.6"/>${fringe(70)}${fringe(330)}`;
}

const LENGTH: Record<NonNullable<Product["specs"]["length"]>, number> = { waist: 0.92, hip: 1.12, thigh: 1.55 };

/** All SVG parts for a garment in one colour. */
export function garmentParts(p: GarmentProduct, color = defaultColor(p), uid = "g"): GarmentParts {
  const k = paintFor(p, color, uid);
  const kind = p.specs.garment ?? "top";
  const parts: GarmentParts = { kind, sleeveReach: 0.55, length: LENGTH[p.specs.length ?? "hip"] };
  if (kind === "top" || kind === "outerwear") {
    parts.torso = torso(p, k);
    if (p.specs.sleeves === "long") {
      parts.sleeveUpper = sleeve(p, k, "upper");
      parts.sleeveLower = sleeve(p, k, "lower");
    } else if (p.specs.sleeves !== "none") {
      parts.sleeveUpper = sleeve(p, k, "short");
    }
  } else if (kind === "headwear") parts.head = head(p, k);
  else if (kind === "eyewear") parts.eyes = eyes(p, k);
  else parts.shawl = shawl(p, k);
  return parts;
}

const inner = (s: string) => s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

/** Flat-lay packshot (400×300 box) composed from the same parts the try-on uses. */
export function flatLaySvg(p: GarmentProduct, color = defaultColor(p), uid = "flat"): string {
  const g = garmentParts(p, color, uid);
  const place = (part: string, w: number, h: number, x: number, y: number, s: number, rot = 0, ox = 0, oy = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(${-ox} ${-oy})"><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" overflow="visible">${inner(part)}</svg></g>`;
  let body = "";
  if (g.torso) {
    const s = g.length > 1.3 ? 0.78 : 0.9;
    const sw = 200 * s;
    const left = 200 - sw / 2;
    if (g.sleeveUpper) {
      const long = !!g.sleeveLower;
      const rot = long ? 24 : 52;
      const len = long ? 0.95 : 0.55;
      body += place(g.sleeveUpper, 100, 160, left + 6, 46, s * 0.62, rot, 50, 0);
      body += place(g.sleeveUpper, 100, 160, left + sw - 6, 46, s * 0.62, -rot, 50, 0);
      if (long && g.sleeveLower) {
        const dx = Math.sin((rot * Math.PI) / 180) * 160 * s * 0.62 * len;
        const dy = Math.cos((rot * Math.PI) / 180) * 160 * s * 0.62 * len;
        body += place(g.sleeveLower, 100, 160, left + 6 - dx, 46 + dy, s * 0.56, rot - 6, 50, 0);
        body += place(g.sleeveLower, 100, 160, left + sw - 6 + dx, 46 + dy, s * 0.56, -rot + 6, 50, 0);
      }
    }
    body += place(g.torso, 200, 240, left, 40, s);
  } else if (g.head) body += place(g.head, 200, 120, 80, 80, 1.2);
  else if (g.eyes) body += place(g.eyes, 220, 80, 46, 110, 1.4);
  else if (g.shawl) body += foldedShawl(p, color, uid);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${body}</svg>`;
}
