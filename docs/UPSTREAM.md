# Upstream code and modifications

Vendored on 2026-11-05 from LingDong Huang's public repositories. Runtime source
is included locally; browsers never depend on upstream availability.

| Project | Source | Upstream Git blob SHA |
| --- | --- | --- |
| fishdraw | `LingDong-/fishdraw`, `main`, `fishdraw.js` | `213e88104481fcc763fa3ee6002fb9764b0704d8` |
| nonflowers | `LingDong-/nonflowers`, `master`, `main.js` | `f0e5a9dc643988777e5ec4fae166e211c2b8d46c` |

A Git blob SHA identifies the exact original file content, rather than a moving
branch tip. Original sources: [fishdraw](https://github.com/LingDong-/fishdraw/blob/main/fishdraw.js),
[nonflowers](https://github.com/LingDong-/nonflowers/blob/master/main.js).

## fishdraw

`dist/vendor/fishdraw.js` retains the original generator in an isolated wrapper.
Changes:

- Export the library as `globalThis.FishDraw`, without running the original CLI.
- Correct the undeclared `lip1s` local so strict mode is possible.
- Add `fish(params, { regions: true })`. Without this option, `fish()` still returns
  the original flat array of polylines. With it, the same generation additionally
  returns named polygons, fin attachment paths and grouped detail paths.
- Capture the actual head, eye and jaw outlines from `fish_head()`, separate from
  the rectangular head clipping mask returned to the original generator.
- Add `createScene(seed, overrides = {})`. It seeds the original RNG, resets its
  Perlin table per specimen, returns the anatomy, and measures the common frame.
  The optional overrides object accepts original fishdraw parameters; the page
  uses the random defaults. Tests use overrides to exercise every scale and tail.
- Original noise, shape construction, clipping and line work remain intact.
  Fixtures computed with unmodified upstream source verify identical polylines
  for three reference seeds.

## nonflowers

`dist/vendor/nonflowers.js` extracts the following routines from `main.js`:

- p5-derived Perlin noise implementation.
- `rgba`, `hsv`, `lerpHue`, `polygon`, `tubify`, `stroke`, `paper`.
- Original `Filter.fade` and `Filter.wispy` pigment operations.

Changes:

- Package them as `Nonflowers.create(seed)` with a private seeded RNG.
- Use a local Math facade, leaving the browser's `Math.random` unchanged.
- Declare tube vertex arrays locally. Guard paths with fewer than two points.
- Provide `filterLayer()` to apply the original two filters to the pigment layer.
- Omit plant construction, application UI and Array prototype modifications.

`dist/paint.js` adapts the coloured-quadrilateral ribbon construction used by the
original `leaf()` to the fish body's upper and lower boundaries. Fin colour
washes, anatomical paint order, palettes and the fish integration are new.
This is an adaptation of nonflowers' rendering techniques, not its entire plant
application operating as an unmodified general-purpose renderer.

## Licenses

Both original full MIT licenses are shipped in `dist/licenses/` and linked from
the page. Preserve them when redistributing or adapting the project.
