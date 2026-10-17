// Copies MediaPipe's WASM runtime from node_modules into public/ so the try-on loads it from our
// own origin (no CDN at runtime). Runs before `dev` and `build`; the output is gitignored.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const src = join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = join(process.cwd(), "public", "mediapipe", "wasm");
if (!existsSync(src)) throw new Error(`MediaPipe wasm not found at ${src}`);
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy_mediapipe] ${src} -> ${dest}`);
