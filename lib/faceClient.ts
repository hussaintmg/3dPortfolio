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
 */
export class BlinkDetector {
  private open = false;
  private closedFrames = 0;
  blinked = false;

  /** @returns true the moment a full open→closed→open cycle completes. */
  push(ear: number) {
    if (ear > 0.26) {
      if (this.closedFrames >= 1 && this.open) {
        this.blinked = true;
        this.closedFrames = 0;
        return true;
      }
      this.open = true;
      this.closedFrames = 0;
    } else if (ear < 0.19 && this.open) {
      this.closedFrames += 1;
    }
    return false;
  }

  reset() {
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
