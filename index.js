// stick-drift-detect — pure stick-drift verdict logic for the Gamepad API.
// Zero dependencies, no DOM. Feed raw (x, y) samples in, get a drift verdict out.
// This is the verdict engine behind the in-browser tester at https://controllertester.co
//
// Algorithm: raw hypot magnitude (NO baseline subtraction — subtraction hides real drift),
// median resting magnitude vs PASS/DRIFT thresholds, with a spread sanity check.

/** Verdict states. */
export const Verdict = Object.freeze({
  PASS: 'PASS',
  DRIFTING: 'DRIFTING',
  FAIL: 'FAIL',
  INVALID: 'INVALID',
  UNAVAILABLE: 'UNAVAILABLE',
});

/** Default tunable thresholds. */
export const THRESHOLDS = Object.freeze({
  PASS_MAX: 0.1, // resting magnitude below this = healthy
  DRIFT_MAX: 0.25, // between PASS_MAX and this = drifting; above = failed
  SPREAD_MAX: 0.08, // p90-p10 magnitude spread above this = stick was moved (invalid)
  WINDOW_MS: 2000,
  MIN_SAMPLES: 30,
});

const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);

/** Percentile of an ASCENDING-sorted array, linear interpolation. p in [0, 1]. */
function percentileSorted(sorted, p) {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const median = (sorted) => percentileSorted(sorted, 0.5);
const ascending = (a, b) => a - b;

/**
 * Classify one stick from raw (x, y) samples collected while it was at rest.
 * @param {ReadonlyArray<readonly [number, number]>} samples raw (x, y) pairs
 * @param {boolean} axesPresent whether this stick's axes exist on the device
 * @param {typeof THRESHOLDS} [t] thresholds (defaults to THRESHOLDS)
 * @returns {{verdict: string, mMed: number, spread: number, dir: {x: number, y: number} | null}}
 */
export function classifyStick(samples, axesPresent, t = THRESHOLDS) {
  if (!axesPresent) return { verdict: Verdict.UNAVAILABLE, mMed: NaN, spread: NaN, dir: null };

  const valid = samples.filter(([x, y]) => isFiniteNum(x) && isFiniteNum(y));
  if (valid.length < t.MIN_SAMPLES) {
    return { verdict: Verdict.INVALID, mMed: NaN, spread: NaN, dir: null };
  }

  const mags = valid.map(([x, y]) => Math.hypot(x, y)).sort(ascending);
  const xs = valid.map(([x]) => x).sort(ascending);
  const ys = valid.map(([, y]) => y).sort(ascending);

  const mMed = median(mags);
  const spread = percentileSorted(mags, 0.9) - percentileSorted(mags, 0.1);
  const dir = { x: median(xs), y: median(ys) };

  if (spread > t.SPREAD_MAX) return { verdict: Verdict.INVALID, mMed, spread, dir };

  const verdict =
    mMed < t.PASS_MAX ? Verdict.PASS : mMed < t.DRIFT_MAX ? Verdict.DRIFTING : Verdict.FAIL;
  return { verdict, mMed, spread, dir };
}

const VERDICT_RANK = Object.freeze({ PASS: 0, DRIFTING: 1, FAIL: 2 });

/**
 * Roll several stick results up to one controller-level verdict (worst real verdict wins).
 * INVALID/UNAVAILABLE sticks are ignored unless none are real.
 * @param {ReadonlyArray<{verdict: string}>} stickResults
 * @returns {string} a Verdict
 */
export function rollupController(stickResults) {
  const real = stickResults.filter((r) => r.verdict in VERDICT_RANK);
  if (real.length === 0) return Verdict.INVALID;
  return real.reduce(
    (worst, r) => (VERDICT_RANK[r.verdict] > VERDICT_RANK[worst] ? r.verdict : worst),
    Verdict.PASS,
  );
}
