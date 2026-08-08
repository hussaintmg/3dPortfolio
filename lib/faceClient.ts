"use client";

/**
 * Browser-side face pipeline for our own face unlock.
 *
 * This is deliberately independent of Windows Hello / Face ID: the camera
 * frame is analysed here, turned into a 128-value descriptor, and only that
 * descriptor leaves the browser. No photo is uploaded or stored anywhere.
 *
 * The models are ~7 MB, so everything loads lazily the first time face
 * unlock is actually used.
 */

type FaceApi = typeof import("@vladmandic/face-api");

const MODEL_URL = "/models/face";

let apiPromise: Promise<FaceApi> | null = null;
let modelsReady = false;

export async function loadFaceApi(): Promise<FaceApi> {
  if (!apiPromise) {
    apiPromise = import("@vladmandic/face-api").then(async (api) => {
      // The bundled tfjs is re-exported without its full type surface
      const tf = api.tf as any;
      // WebGL where available, CPU as a fallback — never fail outright
      try {
        await tf.setBackend("webgl");
      } catch {
        await tf.setBackend("cpu").catch(() => {});
      }
      await tf.ready();
      return api;
    });
  }
  return apiPromise;
}

export async function loadModels(onProgress?: (msg: string) => void) {
  const api = await loadFaceApi();
  if (modelsReady) return api;

  onProgress?.("Loading face models…");
  await api.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await api.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await api.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  modelsReady = true;
  onProgress?.("Ready");
  return api;
}

/**
 * Landmarks only — no descriptor.
 *
 * The recognition network is the expensive part of the pipeline (a few
 * hundred milliseconds a frame). Running it while watching for a blink meant
 * sampling three or four times a second, and a blink lasts about 150ms, so
 * the closed-eye frames were simply never seen. Liveness tracking uses this
 * instead and only pays for a descriptor once it has what it needs.
 */
export async function readEyes(
  video: HTMLVideoElement,
): Promise<{ ear: number; score: number; coverage: number } | null> {
  const api = await loadModels();
  if (!video.videoWidth) return null;

  const result = await api
    .detectSingleFace(
      video,
      new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }),
    )
    .withFaceLandmarks();

  if (!result) return null;

  const { box, score } = result.detection;
  const pts = result.landmarks.positions;
  return {
    ear: (eyeAspect(pts, EYE_LEFT) + eyeAspect(pts, EYE_RIGHT)) / 2,
    score,
    coverage: (box.width * box.height) / (video.videoWidth * video.videoHeight),
  };
}

export const modelsAreReady = () => modelsReady;

export interface FaceReading {
  descriptor: number[];
  /** Detector confidence, 0–1. */
  score: number;
  /** Share of the frame the face covers — too small means "move closer". */
  coverage: number;
  /** Average eye-aspect-ratio; a blink makes this dip sharply. */
  ear: number;
  box: { x: number; y: number; width: number; height: number };
}

const EYE_LEFT = [36, 37, 38, 39, 40, 41];
const EYE_RIGHT = [42, 43, 44, 45, 46, 47];

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Eye-aspect ratio: height over width. Open ≈ 0.3, closed ≈ 0.1. */
function eyeAspect(points: { x: number; y: number }[], idx: number[]) {
  const p = idx.map((i) => points[i]);
  const vertical = dist(p[1], p[5]) + dist(p[2], p[4]);
  const horizontal = 2 * dist(p[0], p[3]);
  return horizontal === 0 ? 0 : vertical / horizontal;
}

/** Reads one frame. Returns null when no single clear face is present. */
export async function readFace(
  video: HTMLVideoElement,
): Promise<FaceReading | null> {
  const api = await loadModels();
  if (!video.videoWidth) return null;

  const result = await api
    .detectSingleFace(
      video,
      new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;

  const { box, score } = result.detection;
  const pts = result.landmarks.positions;
  const ear =
    (eyeAspect(pts, EYE_LEFT) + eyeAspect(pts, EYE_RIGHT)) / 2;

  return {
    descriptor: Array.from(result.descriptor),
    score,
    coverage: (box.width * box.height) / (video.videoWidth * video.videoHeight),
    ear,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
  };
}

/**
 * Tracks eye-aspect-ratio over time to spot a real blink.
 *
 * A held-up photograph never blinks, so this rules out the laziest spoof.
 * It is not a substitute for a proper liveness sensor and is not treated as
 * one — face unlock stays a convenience factor next to the password.
 *
 * Thresholds are CALIBRATED rather than fixed. Eye shape, glasses and camera
 * angle move the resting ratio around enough that one hard-coded number
 * either fires constantly for some people or never fires for others — which
 * is exactly how this failed before.
 */
export class BlinkDetector {
  private samples: number[] = [];
  private baseline = 0;
  private open = false;
  private closedFrames = 0;
  blinked = false;

  /** Frames of open eyes needed before the baseline is trusted. */
  private static CALIBRATION = 8;

  get calibrated() {
    return this.baseline > 0;
  }

  /** How far the eyes are shut right now, 0 (open) → 1 (closed). */
  closedness(ear: number) {
    if (!this.baseline) return 0;
    return Math.min(1, Math.max(0, 1 - ear / this.baseline));
  }

  /** @returns true the moment a full open→closed→open cycle completes. */
  push(ear: number): boolean {
    if (!Number.isFinite(ear) || ear <= 0) return false;

    // Learn this person's open-eye ratio from the first few frames
    if (this.samples.length < BlinkDetector.CALIBRATION) {
      this.samples.push(ear);
      if (this.samples.length === BlinkDetector.CALIBRATION) {
        // Median, so one accidental blink during calibration is ignored
        const sorted = [...this.samples].sort((a, b) => a - b);
        this.baseline = sorted[Math.floor(sorted.length / 2)];
        this.open = true;
      }
      return false;
    }

    const closedAt = this.baseline * 0.72;
    const openAt = this.baseline * 0.88;

    if (ear <= closedAt) {
      if (this.open) this.closedFrames += 1;
    } else if (ear >= openAt) {
      if (this.open && this.closedFrames >= 1) {
        this.blinked = true;
        this.closedFrames = 0;
        return true;
      }
      this.open = true;
      this.closedFrames = 0;
      // Drift with the person: slowly follow a rising open-eye ratio
      this.baseline = this.baseline * 0.94 + ear * 0.06;
    }
    return false;
  }

  reset() {
    this.samples = [];
    this.baseline = 0;
    this.open = false;
    this.closedFrames = 0;
    this.blinked = false;
  }
}

/** Starts the camera, preferring the front-facing one on phones. */
export async function startCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}
