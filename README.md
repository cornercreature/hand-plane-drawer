# Plane

A local-first creative coding studio. Both index fingertips and thumbs control a quadrilateral; movement stamps separate planes along the gesture.

## Run

Requires Node.js 22+.

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Camera access requires localhost or HTTPS. Tracking runs in the browser with MediaPipe; its pinned WASM runtime and hand model download from jsDelivr and Google. Camera frames are not uploaded. Typography downloads from Google Fonts, with system fallbacks.

## Use

- Enable the camera, hold both hands in loose L shapes, then press Space for a three-second countdown. Press Space again to pause.
- Keep both thumbs and index fingers visible. Tracking loss starts a fresh stroke on recovery. Crossed or collapsed quads do not stamp.
- Mouse demo: drag to draw, scroll to rotate, Shift + scroll to resize. Space also toggles continuous mouse drawing.
- Edit: click a plane to select its stroke, drag to move, apply the current brush, or delete. Undo/redo covers drawing and edits; clear is undoable.
- Export PNG at 1×, 2×, or 3× resolution, or SVG with individual polygons grouped by stroke. Camera, grid and fingertip guides are excluded. Background transparency is optional.
- Save/open JSON projects to preserve editable geometry. Projects are not automatically saved; download one before closing.

## Scope

This initial version preserves the webcam's projected perspective in a fixed 1200 × 800 artboard. It does **not** infer shared 3D depth or support orbiting. Exported PNGs are static; SVGs retain vector geometry. Editing currently operates on strokes, not individual corners. Hand identity uses frame-to-frame wrist matching; heavy occlusion or crossed hands can require reacquisition. Initial left/right labels mean screen-left and screen-right in the mirrored view.

The scene is limited to 6,000 planes with 30 undo snapshots. Inference is throttled to 25 Hz on the main thread; worker-based inference and cached rendering are follow-up performance improvements for slower hardware.

## Checks

```sh
npm test
npm run build
```

Geometry tests cover degenerate shapes, camera crop/mirroring, movement sampling, hit testing, SVG structure and project input validation. Camera tracking still needs a real two-hand smoke test on target hardware.

Implementation: [main UI and tracking](src/main.ts), [geometry and serialization](src/geometry.mjs), [styles](src/style.css).

Reference: [Air Calligraphy by Mike van der Sanden](https://mikevandersanden.com/tools/air-calligraphy/). Hand tracking: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js).
