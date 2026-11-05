# Upstream provenance

Vendored from the existing PrettyFish and FrankFish projects on 2026-11-05.

| Component | Source Git blob SHA |
| --- | --- |
| FrankFish `FishDraw_Fast.js` | `214ead3b551ec7c23116e06080d9dcce0da3c775` |
| FrankFish `demo/src/controls.js` | `69baa29254c1005b067fa2a393b3e3d2f7870309` |
| Original nonflowers `main.js` | `f0e5a9dc643988777e5ec4fae166e211c2b8d46c` |
| Original fishdraw (benchmark only) | `213e88104481fcc763fa3ee6002fb9764b0704d8` |

The FrankFish adapter adds region and grouped-path returns after the existing
fast geometry is generated. Its clipping optimizations and random-call order
are untouched. Strict mode fixes one undeclared local. Original control ranges,
choices and discrete values are unchanged; the catalogue now exports ES modules.

The nonflowers primitives come from PrettyFish's existing scoped adaptation.
The paper canvas factory additionally supports OffscreenCanvas. The studio
renderer reuses their noise, alpha filters, HSV functions, paper, polygons and
variable-width strokes, with caching described in [ARCHITECTURE.md](ARCHITECTURE.md).

Complete original MIT licenses are shipped in `dist/licenses/` and linked from
the website. Preserve these notices when adapting or redistributing the code.
