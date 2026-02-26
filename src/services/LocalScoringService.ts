/**
 * LocalScoringService
 *
 * Scores a shadowing attempt locally using recording duration vs.
 * the estimated time it takes a native English speaker to say the phrase.
 *
 * Native pace ≈ 150 WPM = 400 ms/word
 * Learners are expected to be 20-50% slower → we give a wide "perfect" band
 */

const NATIVE_WPM = 150;
const MS_PER_WORD = (60 / NATIVE_WPM) * 1000; // 400 ms

export interface DurationScore {
  score: 1 | 2 | 3 | 4 | 5;
  hint: string;
  hintColor: string;
}

/** Estimated target duration in ms based on word count */
export function estimateExpectedDurationMs(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(wordCount * MS_PER_WORD, 500);
}

/**
 * Scores the recording duration vs the expected phrase duration.
 * ratio < 0.25  → too short (silence / didn't speak)
 * ratio 0.25-0.6 → too fast
 * ratio 0.6-1.8 → good band (native to learner pace)
 * ratio > 1.8   → too slow
 */
export function scoreDuration(recordedMs: number, expectedMs: number): DurationScore {
  if (recordedMs < 400) {
    return { score: 1, hint: "Too short — did you speak?", hintColor: '#FF4757' };
  }

  const ratio = recordedMs / expectedMs;

  if (ratio >= 0.65 && ratio <= 1.7) {
    return { score: 5, hint: "Great pace! 🎯", hintColor: '#5C5CE0' };
  }
  if (ratio >= 0.5 && ratio <= 2.1) {
    return { score: 4, hint: "Good timing! 👏", hintColor: '#4CD97B' };
  }
  if (ratio >= 0.35 && ratio <= 2.6) {
    return { score: 3, hint: ratio < 0.65 ? "A bit too fast" : "A bit slow", hintColor: '#FFD93D' };
  }
  if (ratio >= 0.2) {
    return { score: 2, hint: ratio < 0.5 ? "Too fast — slow down" : "Too slow — speed up", hintColor: '#FF8B3E' };
  }
  return { score: 1, hint: "Way too brief — try again!", hintColor: '#FF4757' };
}

/**
 * Sørensen-Dice word similarity coefficient (0–1).
 * Kept for future features or manual comparison.
 */
export function wordSimilarity(a: string, b: string): number {
  const tokens = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const setA = tokens(a);
  const setB = tokens(b);
  if (!setA.length && !setB.length) return 1;
  if (!setA.length || !setB.length) return 0;
  const countB = new Map<string, number>();
  for (const w of setB) countB.set(w, (countB.get(w) ?? 0) + 1);
  let matches = 0;
  for (const w of setA) {
    const c = countB.get(w) ?? 0;
    if (c > 0) { matches++; countB.set(w, c - 1); }
  }
  return (2 * matches) / (setA.length + setB.length);
}
