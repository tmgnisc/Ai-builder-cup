import type { PoseLandmarker } from "@mediapipe/tasks-vision";

/**
 * MediaPipe Pose Landmarker, loaded on first use only (the try-on is the sole consumer).
 * WASM and model are served from our own origin (/mediapipe), so nothing depends on a CDN
 * and no camera frames ever leave the browser.
 */
let landmarker: Promise<PoseLandmarker> | null = null;
let mode: "VIDEO" | "IMAGE" = "VIDEO";

async function create(): Promise<PoseLandmarker> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate },
    runningMode: mode,
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    // No WebGL2 / GPU delegate: the CPU path is slower but works everywhere.
    return PoseLandmarker.createFromOptions(fileset, options("CPU"));
  }
}

export async function getPoseLandmarker(runningMode: "VIDEO" | "IMAGE"): Promise<PoseLandmarker> {
  if (!landmarker) {
    mode = runningMode;
    landmarker = create().catch((err) => {
      landmarker = null;
      throw err;
    });
  }
  const lm = await landmarker;
  if (mode !== runningMode) {
    await lm.setOptions({ runningMode });
    mode = runningMode;
  }
  return lm;
}
