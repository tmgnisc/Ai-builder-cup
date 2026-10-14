"use client";

/**
 * Microphone level meter (Web Audio AnalyserNode). Calls `onLevel` with a smoothed
 * 0–1 loudness every animation frame until stopped. Audio never leaves the browser.
 */
export async function startMicMeter(onLevel: (level: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);

  let raf = 0;
  let level = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    // Speech RMS is typically 0.02–0.25; map to 0–1 with a soft knee and fast attack / slow release.
    const target = Math.min(1, Math.max(0, (rms - 0.01) * 5));
    level = target > level ? level + (target - level) * 0.6 : level + (target - level) * 0.12;
    onLevel(level);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    onLevel(0);
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
}
