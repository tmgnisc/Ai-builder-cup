import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { flatLaySvg } from "@/features/tryon";

interface ProductImageProps {
  product: Pick<Product, "id" | "brand" | "name" | "category" | "palette"> & Partial<Pick<Product, "tags" | "specs">>;
  /** Clothing: which colour option to draw (defaults to the first). */
  color?: string;
  className?: string;
  /** Distinguishes multiple renders of the same product on one page (gradient ids). */
  variant?: string;
  showInitials?: boolean;
  /** Gallery angle: same device, different framing. */
  view?: "front" | "angle" | "detail";
}

type DeviceKind = "laptop" | "phone" | "overEar" | "earbuds" | "monitor" | "keyboard" | "mouse" | "ssd" | "charger" | "powerBank";

export function deviceKind(product: ProductImageProps["product"]): DeviceKind {
  const tags = product.tags ?? [];
  const name = product.name.toLowerCase();
  switch (product.category) {
    case "laptops":
      return "laptop";
    case "phones":
      return "phone";
    case "headphones":
      return tags.includes("earbuds") || /buds|airpods|liberty/.test(name) ? "earbuds" : "overEar";
    default:
      if (tags.includes("monitor")) return "monitor";
      if (tags.includes("keyboard")) return "keyboard";
      if (tags.includes("mouse")) return "mouse";
      if (tags.includes("storage")) return "ssd";
      if (/power ?bank|737/.test(name)) return "powerBank";
      return "charger";
  }
}

// ── Colour helpers (palette values are #rrggbb from the catalog) ──
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return hex(x.map((v, i) => v + (y[i] - v) * t));
};
const luminance = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

interface Finish {
  accent: string;
  body: string;
  hi: string;
  lo: string;
  screenA: string;
  screenB: string;
}

/** Device finish from the brand palette: light palettes read as silver/white, the rest as tinted graphite. */
function finishFor([a, b]: readonly [string, string]): Finish {
  const light = luminance(a) > 0.72;
  const body = light ? mix(a, "#c9ccd6", 0.45) : mix(b, "#3a3d47", 0.4);
  return {
    accent: a,
    body,
    hi: mix(body, "#ffffff", light ? 0.45 : 0.16),
    lo: mix(body, "#000000", light ? 0.28 : 0.4),
    screenA: light ? mix(b, "#7a8cff", 0.35) : mix(a, b, 0.25),
    screenB: mix(b, "#000000", 0.45),
  };
}

const VIEW: Record<NonNullable<ProductImageProps["view"]>, string> = {
  front: "",
  angle: "translate(200 160) rotate(-7) skewX(-6) scale(0.94) translate(-200 -160)",
  detail: "translate(200 150) scale(1.8) translate(-212 -128)",
};

/**
 * Generated product art: a per-category device drawn from the product's brand palette on a theme-aware
 * studio backdrop. Pure SVG (no assets); `meet` with an oversized backdrop so nothing crops at any aspect.
 */
export function ProductImage({ product, className, variant = "card", showInitials = true, view = "front", color }: ProductImageProps) {
  const id = `pi-${product.id}-${variant}-${view}`;
  const f = finishFor(product.palette);
  const kind = deviceKind(product);
  const g = (name: string) => `url(#${id}-${name})`;

  return (
    <div
      role="img"
      aria-label={`${product.brand} ${product.name}`}
      className={cn("relative size-full overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 90% at 50% 18%, color-mix(in oklab, ${f.accent} 16%, var(--surface-2)), var(--surface) 70%)`,
      }}
    >
      {product.category === "clothing" && product.specs ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated inline SVG, nothing to optimise
        <img
          alt=""
          aria-hidden
          draggable={false}
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(flatLaySvg({ ...product, tags: product.tags ?? [], specs: product.specs }, color))}`}
          className="absolute inset-0 size-full object-contain"
          style={{ transform: view === "detail" ? "scale(1.8) translate(0, 10%)" : view === "angle" ? "rotate(-6deg) scale(0.94)" : undefined }}
        />
      ) : (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={f.hi} />
            <stop offset="1" stopColor={f.body} />
          </linearGradient>
          <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={f.lo} />
            <stop offset="0.5" stopColor={f.body} />
            <stop offset="1" stopColor={f.lo} />
          </linearGradient>
          <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={f.screenA} />
            <stop offset="1" stopColor={f.screenB} />
          </linearGradient>
          <linearGradient id={`${id}-glare`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop offset="0" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={VIEW[view]}>{DEVICES[kind]({ f, g })}</g>
      </svg>
      )}
      {showInitials && (
        <span aria-hidden className="absolute bottom-3 right-3 font-display text-2xs font-semibold uppercase tracking-widest text-muted">
          {initials(product)}
        </span>
      )}
    </div>
  );
}

interface Paint {
  f: Finish;
  g: (name: string) => string;
}

const Shadow = ({ g, cx = 200, cy = 250, rx = 130 }: { g: Paint["g"]; cx?: number; cy?: number; rx?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.07} fill={g("shadow")} />
);

/** A screen with a hint of UI: a window card and a few lines. */
const Screen = ({ x, y, w, h, r, g }: { x: number; y: number; w: number; h: number; r: number; g: Paint["g"] }) => (
  <>
    <rect x={x} y={y} width={w} height={h} rx={r} fill={g("screen")} />
    <rect x={x + w * 0.1} y={y + h * 0.16} width={w * 0.5} height={h * 0.5} rx={r * 0.6} fill="#ffffff" fillOpacity="0.1" />
    <rect x={x + w * 0.66} y={y + h * 0.16} width={w * 0.24} height={h * 0.07} rx="1.5" fill="#ffffff" fillOpacity="0.16" />
    <rect x={x + w * 0.66} y={y + h * 0.28} width={w * 0.18} height={h * 0.07} rx="1.5" fill="#ffffff" fillOpacity="0.1" />
    <rect x={x} y={y} width={w} height={h} rx={r} fill={g("glare")} />
  </>
);

const DEVICES: Record<DeviceKind, (p: Paint) => ReactNode> = {
  laptop: ({ f, g }) => (
    <>
      <Shadow g={g} cy={238} rx={140} />
      <rect x="108" y="54" width="184" height="134" rx="9" fill={f.lo} />
      <rect x="108" y="54" width="184" height="134" rx="9" fill="none" stroke={f.hi} strokeOpacity="0.5" />
      <Screen x={116} y={62} w={168} h={118} r={4} g={g} />
      <circle cx="200" cy="58" r="1.4" fill="#000000" fillOpacity="0.6" />
      <path d="M100 188h200l22 40H78Z" fill={g("body")} />
      <path d="M78 228h244l-3 5H81Z" fill={f.lo} />
      <path d="M118 194h164l9 16H109Z" fill={f.lo} fillOpacity="0.55" />
      <rect x="176" y="214" width="48" height="9" rx="2" fill={f.lo} fillOpacity="0.45" />
      <rect x="186" y="228" width="28" height="3" rx="1.5" fill={f.lo} />
    </>
  ),
  phone: ({ f, g }) => (
    <>
      <Shadow g={g} cy={258} rx={90} />
      <g transform="rotate(-11 160 165)">
        <rect x="118" y="70" width="78" height="168" rx="14" fill={g("body")} />
        <rect x="118" y="70" width="78" height="168" rx="14" fill="none" stroke={f.hi} strokeOpacity="0.6" />
        <rect x="126" y="80" width="38" height="40" rx="9" fill={f.lo} fillOpacity="0.7" />
        <circle cx="136" cy="91" r="6" fill="#0b0c10" stroke={f.hi} strokeOpacity="0.5" />
        <circle cx="136" cy="109" r="6" fill="#0b0c10" stroke={f.hi} strokeOpacity="0.5" />
        <circle cx="154" cy="100" r="3" fill={f.accent} fillOpacity="0.7" />
      </g>
      <rect x="196" y="56" width="82" height="178" rx="15" fill={f.lo} />
      <rect x="196" y="56" width="82" height="178" rx="15" fill="none" stroke={f.hi} strokeOpacity="0.7" />
      <Screen x={200} y={60} w={74} h={170} r={12} g={g} />
      <rect x="226" y="66" width="22" height="6" rx="3" fill="#000000" />
      <rect x="278" y="96" width="2" height="22" rx="1" fill={f.hi} />
    </>
  ),
  overEar: ({ f, g }) => (
    <>
      <Shadow g={g} cy={252} rx={120} />
      <path d="M128 168C128 92 160 60 200 60s72 32 72 108" fill="none" stroke={f.lo} strokeWidth="16" strokeLinecap="round" />
      <path d="M128 168C128 92 160 60 200 60s72 32 72 108" fill="none" stroke={f.hi} strokeWidth="3" strokeOpacity="0.55" strokeLinecap="round" />
      <rect x="120" y="150" width="16" height="30" rx="5" fill={f.body} />
      <rect x="264" y="150" width="16" height="30" rx="5" fill={f.body} />
      <rect x="96" y="166" width="58" height="80" rx="26" fill={g("body")} />
      <rect x="146" y="172" width="14" height="68" rx="7" fill={f.lo} />
      <rect x="246" y="166" width="58" height="80" rx="26" fill={g("body")} />
      <rect x="240" y="172" width="14" height="68" rx="7" fill={f.lo} />
      <rect x="112" y="196" width="26" height="3" rx="1.5" fill={f.accent} fillOpacity="0.8" />
      <rect x="262" y="196" width="26" height="3" rx="1.5" fill={f.accent} fillOpacity="0.8" />
    </>
  ),
  earbuds: ({ f, g }) => (
    <>
      <Shadow g={g} cy={246} rx={92} />
      <rect x="138" y="150" width="124" height="88" rx="36" fill={g("body")} />
      <rect x="138" y="150" width="124" height="88" rx="36" fill="none" stroke={f.hi} strokeOpacity="0.6" />
      <path d="M140 178h120" stroke={f.lo} strokeOpacity="0.6" />
      <circle cx="200" cy="200" r="2.6" fill={f.accent} />
      {[
        { x: 166, r: -18 },
        { x: 234, r: 18 },
      ].map((b) => (
        <g key={b.x} transform={`rotate(${b.r} ${b.x} 110)`}>
          <ellipse cx={b.x} cy="92" rx="19" ry="17" fill={g("body")} />
          <ellipse cx={b.x} cy="92" rx="8" ry="7" fill={f.lo} />
          <rect x={b.x - 6} y="100" width="12" height="40" rx="6" fill={g("body")} />
          <rect x={b.x - 3} y="132" width="6" height="6" rx="2" fill={f.accent} fillOpacity="0.6" />
        </g>
      ))}
    </>
  ),
  monitor: ({ f, g }) => (
    <>
      <Shadow g={g} cy={250} rx={110} />
      <rect x="74" y="40" width="252" height="150" rx="8" fill={f.lo} />
      <rect x="74" y="40" width="252" height="150" rx="8" fill="none" stroke={f.hi} strokeOpacity="0.5" />
      <Screen x={80} y={46} w={240} h={136} r={3} g={g} />
      <rect x="190" y="190" width="20" height="44" fill={g("side")} />
      <rect x="150" y="232" width="100" height="10" rx="5" fill={g("body")} />
    </>
  ),
  keyboard: ({ f, g }) => (
    <>
      <Shadow g={g} cy={232} rx={150} />
      <path d="M78 112h244l18 104H60Z" fill={g("body")} />
      <path d="M60 216h280v8H60Z" fill={f.lo} />
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 13 }, (_, col) => {
          const y = 122 + row * 18;
          const inset = (5 - row) * 3.2;
          const w = (244 + (row + 1) * 6.4 - inset * 2) / 13;
          const x = 78 - row * 3.4 + inset + col * w;
          const accent = (row === 0 && col === 0) || (row === 2 && col === 12);
          const space = row === 4 && col >= 4 && col <= 8;
          if (space && col !== 4) return null;
          return (
            <rect
              key={`${row}-${col}`}
              x={x + 1.2}
              y={y}
              width={space ? w * 5 - 2.4 : w - 2.4}
              height="14"
              rx="2.5"
              fill={accent ? f.accent : f.lo}
              fillOpacity={accent ? 0.9 : 0.75}
            />
          );
        }),
      )}
    </>
  ),
  mouse: ({ f, g }) => (
    <>
      <Shadow g={g} cy={246} rx={74} />
      <path d="M200 58c44 0 66 38 66 92 0 52-22 92-66 92s-62-30-62-70c0-22 8-30 8-48 0-38 16-66 54-66Z" fill={g("body")} />
      <path d="M200 58c44 0 66 38 66 92 0 52-22 92-66 92s-62-30-62-70c0-22 8-30 8-48 0-38 16-66 54-66Z" fill="none" stroke={f.hi} strokeOpacity="0.55" />
      <path d="M204 60v62" stroke={f.lo} strokeOpacity="0.7" />
      <rect x="198" y="80" width="12" height="26" rx="6" fill={f.lo} />
      <rect x="201" y="86" width="6" height="14" rx="3" fill={f.accent} fillOpacity="0.7" />
      <rect x="140" y="150" width="9" height="30" rx="4.5" fill={f.lo} />
    </>
  ),
  ssd: ({ f, g }) => (
    <>
      <Shadow g={g} cy={232} rx={84} />
      <rect x="140" y="88" width="120" height="136" rx="16" fill={g("body")} />
      <rect x="140" y="88" width="120" height="136" rx="16" fill="none" stroke={f.hi} strokeOpacity="0.55" />
      <rect x="152" y="100" width="96" height="112" rx="10" fill={f.lo} fillOpacity="0.45" />
      <rect x="168" y="150" width="64" height="4" rx="2" fill={f.accent} fillOpacity="0.85" />
      <rect x="186" y="88" width="28" height="5" rx="2.5" fill="#0b0c10" />
    </>
  ),
  charger: ({ f, g }) => (
    <>
      <Shadow g={g} cy={240} rx={70} />
      <rect x="152" y="84" width="96" height="146" rx="20" fill={g("body")} />
      <rect x="152" y="84" width="96" height="146" rx="20" fill="none" stroke={f.hi} strokeOpacity="0.55" />
      {[104, 126, 148].map((y, i) => (
        <rect key={y} x="186" y={y} width="28" height="9" rx="4.5" fill="#0b0c10" stroke={i === 0 ? f.accent : f.hi} strokeOpacity={i === 0 ? 0.9 : 0.3} />
      ))}
      <rect x="168" y="200" width="64" height="3" rx="1.5" fill={f.accent} fillOpacity="0.8" />
    </>
  ),
  powerBank: ({ f, g }) => (
    <>
      <Shadow g={g} cy={234} rx={110} />
      <rect x="104" y="112" width="192" height="106" rx="22" fill={g("body")} />
      <rect x="104" y="112" width="192" height="106" rx="22" fill="none" stroke={f.hi} strokeOpacity="0.55" />
      <rect x="128" y="136" width="70" height="40" rx="8" fill="#0b0c10" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={138 + i * 13} y="148" width="9" height="16" rx="2" fill={f.accent} fillOpacity={i < 3 ? 0.9 : 0.25} />
      ))}
      <rect x="226" y="140" width="40" height="8" rx="4" fill="#0b0c10" />
      <rect x="226" y="156" width="40" height="8" rx="4" fill="#0b0c10" />
    </>
  ),
};
