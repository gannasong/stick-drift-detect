export type Verdict = 'PASS' | 'DRIFTING' | 'FAIL' | 'INVALID' | 'UNAVAILABLE';

export declare const Verdict: {
  readonly PASS: 'PASS';
  readonly DRIFTING: 'DRIFTING';
  readonly FAIL: 'FAIL';
  readonly INVALID: 'INVALID';
  readonly UNAVAILABLE: 'UNAVAILABLE';
};

/** A raw stick reading: (x, y) axis pair, each nominally in [-1, 1]. */
export type Sample = readonly [number, number];

/** Per-stick classification result. `dir` = median offset, for direction display. */
export interface StickResult {
  readonly verdict: Verdict;
  readonly mMed: number;
  readonly spread: number;
  readonly dir: { readonly x: number; readonly y: number } | null;
}

/** Tunable thresholds. */
export interface Thresholds {
  readonly PASS_MAX: number;
  readonly DRIFT_MAX: number;
  readonly SPREAD_MAX: number;
  readonly WINDOW_MS: number;
  readonly MIN_SAMPLES: number;
}

export declare const THRESHOLDS: Thresholds;

/** Classify one stick from raw (x, y) samples collected while it was at rest. */
export declare function classifyStick(
  samples: ReadonlyArray<Sample>,
  axesPresent: boolean,
  t?: Thresholds,
): StickResult;

/** Roll several stick results up to one controller-level verdict (worst real verdict wins). */
export declare function rollupController(stickResults: ReadonlyArray<StickResult>): Verdict;
