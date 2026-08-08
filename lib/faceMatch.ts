/**
 * Server-side face descriptor matching.
 *
 * Matching deliberately happens here rather than in the browser: a client
 * that decides for itself whether a face matched is no security at all.
 * The browser only ever sends the descriptor it measured.
 */

/** face-api's own matcher uses 0.6; a login deserves a tighter fit. */
export const DEFAULT_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.45);

export function isDescriptor(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 128 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

export function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Distance to the closest enrolled sample. */
export function bestDistance(candidate: number[], samples: number[][]): number {
  let best = Infinity;
  for (const s of samples) {
    if (s.length !== candidate.length) continue;
    const d = euclidean(candidate, s);
    if (d < best) best = d;
  }
  return best;
}

export function matches(
  candidate: number[],
  samples: number[][],
  threshold = DEFAULT_THRESHOLD,
) {
  const distance = bestDistance(candidate, samples);
  return { ok: distance <= threshold, distance };
}

/**
 * Enrolment samples should be of the SAME person but not identical frames —
 * near-duplicates add nothing and make the profile brittle.
 */
export function sampleQuality(samples: number[][]) {
  if (samples.length < 2) return { spread: 0, consistent: true };
  let min = Infinity;
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    for (let j = i + 1; j < samples.length; j += 1) {
      const d = euclidean(samples[i], samples[j]);
      if (d < min) min = d;
      if (d > max) max = d;
    }
  }
  // Anything beyond ~0.6 apart is very likely a different person
  return { spread: max, consistent: max <= 0.6, closest: min };
}
