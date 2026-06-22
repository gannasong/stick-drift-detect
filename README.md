# stick-drift-detect

Pure, zero-dependency **stick-drift detection** for the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API). Feed it raw analog-stick `(x, y)` samples collected while the stick is **at rest**, and it returns a clear **`PASS` / `DRIFTING` / `FAIL`** verdict — not just raw numbers you have to interpret yourself.

This is the exact verdict engine behind **[Controller Tester](https://controllertester.co)** — a free, in-browser controller / gamepad tester. Try the full interactive version, no install:

👉 **[controllertester.co/stick-drift-test](https://controllertester.co/stick-drift-test)**

## Install

```sh
npm install stick-drift-detect
```

## Usage

```js
import { classifyStick, rollupController, Verdict } from 'stick-drift-detect';

// Poll navigator.getGamepads()[i].axes for ~2s while the stick is untouched,
// collecting raw (x, y) readings:
const leftStickSamples = [
  [0.01, -0.02], [0.0, 0.01], [0.02, 0.0], /* ...30+ samples... */
];

const left = classifyStick(leftStickSamples, /* axesPresent */ true);

console.log(left.verdict); // 'PASS' | 'DRIFTING' | 'FAIL' | 'INVALID' | 'UNAVAILABLE'
console.log(left.mMed);    // median resting magnitude — how far the stick sits off-center

// Combine multiple sticks into one controller-level verdict (worst real verdict wins):
const overall = rollupController([left, right]);
if (overall === Verdict.FAIL) console.log('This controller has stick drift.');
```

## How it works

1. Each `(x, y)` sample is reduced to a magnitude with `Math.hypot(x, y)` — the distance of the stick from dead center. **No baseline subtraction**: subtracting a resting offset would hide the very drift you are trying to measure.
2. The **median** magnitude over the window is the drift amount (`mMed`), robust to occasional spikes.
3. A **spread** check (p90 − p10 of magnitudes) catches the case where the stick was actually moved during sampling and marks the run `INVALID`.
4. The median is compared against thresholds:
   - `mMed < 0.10` → `PASS`
   - `0.10 ≤ mMed < 0.25` → `DRIFTING`
   - `mMed ≥ 0.25` → `FAIL`

Thresholds are exported as `THRESHOLDS` and can be overridden per call.

## API

- `classifyStick(samples, axesPresent, thresholds?) → StickResult` — classify one stick.
- `rollupController(stickResults) → Verdict` — worst real verdict across sticks.
- `THRESHOLDS` — default tunable thresholds.
- `Verdict` — the verdict string constants.

Full TypeScript types are bundled.

## License

MIT — built for and by [controllertester.co](https://controllertester.co).
