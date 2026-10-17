"use client";

import { Camera, CameraOff, Download, ImageUp, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProductImage } from "@/features/catalog";
import { cn } from "@/lib/cn";
import { getAllProducts, getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { useCart } from "@/store/useCart";
import { useTryOn } from "@/store/useTryOn";
import { defaultColor, garmentParts, type GarmentParts } from "./garmentArt";
import { getPoseLandmarker } from "./pose";
import { rig, smooth, toCanvas, type Landmark, type Placement, type RigStatus } from "./rig";

type Phase = "intro" | "loading" | "camera" | "photo" | "error";

const HINT: Record<RigStatus, string> = {
  ok: "",
  "no-person": "Step into the frame",
  "need-shoulders": "Step back so your shoulders are in view",
  "need-face": "Face the camera so I can see your eyes",
};

const svgImage = (svg: string) =>
  new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("[tryon] Failed to load garment SVG part");
      resolve(img);
    };
    if (svg.startsWith("<svg") || svg.startsWith("<?xml")) {
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } else {
      img.src = svg;
    }
  });

type PartImages = Partial<Record<Placement["part"], HTMLImageElement>>;

async function loadParts(parts: GarmentParts): Promise<PartImages> {
  try {
    const entries = Object.entries({
      torso: parts.torso,
      sleeveUpper: parts.sleeveUpper,
      sleeveLower: parts.sleeveLower,
      head: parts.head,
      eyes: parts.eyes,
      shawl: parts.shawl,
    }).filter((e): e is [Placement["part"], string] => !!e[1]);
    const imgs = await Promise.all(entries.map(([, svg]) => svgImage(svg)));
    return Object.fromEntries(entries.map(([k], i) => [k, imgs[i]]));
  } catch (err) {
    console.warn("[tryon] loadParts error:", err);
    return {};
  }
}

function drawGarment(ctx: CanvasRenderingContext2D, placements: Placement[], imgs: PartImages) {
  try {
    for (const p of placements) {
      const img = imgs[p.part];
      if (!img || !img.complete || img.naturalWidth === 0) continue;
      ctx.setTransform(p.ax.x, p.ax.y, p.ay.x, p.ay.y, p.origin.x, p.origin.y);
      ctx.drawImage(img, 0, 0, p.w, p.h);
    }
  } catch (err) {
    console.warn("[tryon] drawGarment error:", err);
  } finally {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

/**
 * Virtual try-on studio. Everything runs on the shopper's device: MediaPipe Pose finds shoulders,
 * elbows, wrists and face, and the garment's SVG parts are drawn onto the camera frame (or an
 * uploaded photo) with the rig in rig.ts. No frames are uploaded anywhere.
 */
export default function TryOnStudio() {
  const open = useTryOn((s) => s.open);
  const productId = useTryOn((s) => s.productId);
  const colors = useTryOn((s) => s.colors);
  const select = useTryOn((s) => s.select);
  const setColor = useTryOn((s) => s.setColor);
  const close = useTryOn((s) => s.close);
  const addWithFeedback = useCart((s) => s.addWithFeedback);
  const busy = useCart((s) => (productId ? s.pending.includes(productId) : false));

  const garments = useMemo(() => getAllProducts().filter((p) => p.category === "clothing"), []);
  const product = (productId && getProduct(productId)) || garments[0];
  const color = (product && colors[product.id]) || (product ? defaultColor(product) : "");

  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<RigStatus>("ok");
  const [added, setAdded] = useState<"idle" | "ok" | "fail">("idle");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const partsRef = useRef<PartImages>({});
  const rigOptRef = useRef<Parameters<typeof rig>[1] | null>(null);
  const smoothRef = useRef<Landmark[] | null>(null);
  const photoLandmarks = useRef<Landmark[] | null>(null);
  const statusRef = useRef<RigStatus>("ok");

  const report = useCallback((s: RigStatus) => {
    if (statusRef.current !== s) {
      statusRef.current = s;
      setStatus(s);
    }
  }, []);

  // Garment parts for the current product + colour, rasterised once per change.
  useEffect(() => {
    if (!product) return;
    const parts = garmentParts(product, color, "tryon");
    rigOptRef.current = {
      kind: parts.kind,
      hasUpper: !!parts.sleeveUpper,
      hasLower: !!parts.sleeveLower,
      sleeveReach: parts.sleeveReach,
      length: parts.length,
      crown: product.tags.includes("topi"),
    };
    let cancelled = false;
    void loadParts(parts).then((imgs) => {
      if (cancelled) return;
      partsRef.current = imgs;
      if (phase === "photo") renderPhoto();
    });
    return () => {
      cancelled = true;
    };
    // renderPhoto is stable for the life of the photo; re-run only on garment changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, color]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    smoothRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase("intro");
      setAdded("idle");
    }
  }, [open, stopCamera]);
  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setPhase("loading");
    setError("");
    try {
      const [stream, landmarker] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
        getPoseLandmarker("VIDEO"),
      ]);
      streamRef.current = stream;
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;
      setPhase("camera");

      let lastTs = -1;
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || video.readyState < 2) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        // Selfie view: mirror the frame, and the landmarks with it.
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();

        const ts = performance.now();
        if (ts <= lastTs) return;
        lastTs = ts;
        const result = landmarker.detectForVideo(video, ts);
        const raw = result.landmarks[0];
        const opt = rigOptRef.current;
        if (!raw || !opt) {
          smoothRef.current = null;
          return report("no-person");
        }
        const lms = smooth(smoothRef.current, toCanvas(raw as Landmark[], w, h, true));
        smoothRef.current = lms;
        const { status: s, placements } = rig(lms, opt);
        report(s);
        drawGarment(ctx, placements, partsRef.current);
      };
      loop();
    } catch (err) {
      stopCamera();
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      const missing = err instanceof DOMException && err.name === "NotFoundError";
      setError(
        denied
          ? "Camera access was blocked. Allow the camera in your browser, or upload a photo instead."
          : missing
            ? "No camera found on this device. Upload a photo instead."
            : "The try-on couldn't start on this browser. Upload a photo instead.",
      );
      setPhase("error");
    }
  }

  function renderPhoto() {
    const canvas = canvasRef.current;
    const img = photoRef.current;
    const ctx = canvas?.getContext("2d");
    const opt = rigOptRef.current;
    if (!canvas || !img || !ctx || !opt) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const lms = photoLandmarks.current;
    if (!lms) return report("no-person");
    const { status: s, placements } = rig(lms, opt);
    report(s);
    drawGarment(ctx, placements, partsRef.current);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    stopCamera();
    setPhase("loading");
    setError("");
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      // Keep the working size reasonable: pose accuracy doesn't improve past ~1280px.
      const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const landmarker = await getPoseLandmarker("IMAGE");
      const result = landmarker.detect(img);
      photoRef.current = img;
      photoLandmarks.current = result.landmarks[0] ? toCanvas(result.landmarks[0] as Landmark[], w, h, false) : null;
      setPhase("photo");
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        renderPhoto();
      });
    } catch {
      setError("That photo couldn't be read. Try a JPG or PNG with your upper body in view.");
      setPhase("error");
    }
  }

  function snapshot() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob || !product) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `persona-tryon-${product.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  async function addToCart() {
    if (!product) return;
    const ok = await addWithFeedback(product.id, canvasRef.current);
    setAdded(ok ? "ok" : "fail");
    window.setTimeout(() => setAdded("idle"), 2400);
  }

  if (!product) return null;
  const live = phase === "camera" || phase === "photo";
  const out = product.stock === 0;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Virtual try-on"
      description="Runs entirely on your device. Your camera and photos never leave this browser."
      className="max-w-6xl"
    >
      <div className="grid gap-6 lg:tryon-grid">
        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-card bg-surface-2 hairline">
          <canvas ref={canvasRef} className={cn("absolute inset-0 size-full object-contain", !live && "hidden")} aria-label={`Live preview wearing ${product.name}`} />

          {phase === "intro" && (
            <div className="flex max-w-sm flex-col items-center gap-4 p-6 text-center">
              <Camera className="size-8 text-accent-text" aria-hidden />
              <p className="text-sm text-muted">
                Stand back so your head and shoulders are in view. The garment follows your shoulders, arms and face as you move.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => void startCamera()} iconLeft={<Camera className="size-4" aria-hidden />}>
                  Start camera
                </Button>
                <PhotoButton onFile={onPhoto} />
              </div>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="size-3.5 text-accent-text" aria-hidden /> Pose tracking runs locally with MediaPipe.
              </p>
            </div>
          )}

          {phase === "loading" && (
            <p className="inline-flex items-center gap-2 text-sm text-muted" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading the pose model (about 6 MB, once)…
            </p>
          )}

          {phase === "error" && (
            <div className="flex max-w-sm flex-col items-center gap-4 p-6 text-center" role="alert">
              <CameraOff className="size-8 text-danger" aria-hidden />
              <p className="text-sm text-muted">{error}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => void startCamera()} iconLeft={<RefreshCw className="size-4" aria-hidden />}>
                  Try camera again
                </Button>
                <PhotoButton onFile={onPhoto} />
              </div>
            </div>
          )}

          {live && status !== "ok" && (
            <p role="status" className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-lg bg-bg/80 px-3 py-1.5 text-sm backdrop-blur-sm">
              {HINT[status]}
            </p>
          )}
          {live && (
            <div className="absolute right-3 top-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={snapshot} iconLeft={<Download className="size-3.5" aria-hidden />}>
                Snapshot
              </Button>
              {phase === "photo" ? (
                <Button size="sm" variant="secondary" onClick={() => void startCamera()} iconLeft={<Camera className="size-3.5" aria-hidden />}>
                  Use camera
                </Button>
              ) : (
                <PhotoButton onFile={onPhoto} small />
              )}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-muted">{product.brand}</p>
            <h3 className="font-display text-lg font-semibold tracking-tight">{product.name}</h3>
            <p className="mt-1 font-mono text-base font-semibold tabular">{formatNPR(product.price)}</p>
            {product.specs.sizes && <p className="mt-1 text-xs text-muted">Sizes: {product.specs.sizes.join(", ")}</p>}
          </div>

          {product.specs.colors && product.specs.colors.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted">Colour: {product.specs.colors.find((c) => c.hex === color)?.name}</legend>
              <div className="flex flex-wrap gap-2">
                {product.specs.colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(product.id, c.hex)}
                    aria-label={c.name}
                    aria-pressed={c.hex === color}
                    className={cn("size-8 rounded-full hairline", c.hex === color && "outline outline-2 outline-offset-2 outline-accent-text")}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-muted">Try something else</p>
            <ul className="grid grid-cols-4 gap-2">
              {garments.map((g: Product) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => select(g.id)}
                    aria-label={`Try on ${g.name}`}
                    aria-pressed={g.id === product.id}
                    className={cn(
                      "aspect-square w-full overflow-hidden rounded-lg hairline transition-shadow",
                      g.id === product.id && "outline outline-2 outline-accent-text",
                    )}
                  >
                    <ProductImage product={g} variant={`tryon-${g.id}`} showInitials={false} color={colors[g.id]} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button onClick={() => void addToCart()} disabled={out} loading={busy}>
              {out ? "Out of stock" : added === "ok" ? "Added & verified ✓" : added === "fail" ? "Couldn't add, try again" : "Add to cart"}
            </Button>
            <Link href={`/product/${product.id}`} onClick={close} className="text-center text-xs text-muted hover:text-text">
              View product details
            </Link>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function PhotoButton({ onFile, small }: { onFile: (f: File | undefined) => void; small?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <Button size={small ? "sm" : "md"} variant="secondary" onClick={() => ref.current?.click()} iconLeft={<ImageUp className={small ? "size-3.5" : "size-4"} aria-hidden />}>
        Upload a photo
      </Button>
    </>
  );
}
