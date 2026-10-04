# ORRA Rendering Pipeline — Phase 1: Post-Processing Foundation

**Date:** 2026-09-22
**Status:** Approved, ready for implementation plan.

## Context

ORRA (`src/world/*`) is a from-scratch Three.js world engine, and the goal set for it is cinematic-realism-grade visual quality, pushed to the ceiling of the idea rather than scoped to current hardware (see project decision: don't scope ORRA to current GPU limits — hardware adapts underneath via the existing tiering system, it doesn't cap the design).

Confirmed from the code: there is currently **no post-processing** anywhere in the engine. `OrraScene` (`src/world/engine/scene.ts`) calls `renderer.render(this.scene, this.camera)` directly at two sites — the main animation loop (`startAnimationLoop`) and the high-resolution screenshot/postcard capture path. Atmospheric effects (god rays, clouds) are hand-placed geometry with custom shaders, explicitly built to avoid needing a post pass.

This is the first of four planned phases:
1. **Post-processing pipeline foundation** (this spec)
2. Atmosphere & volumetrics (raymarched fog/clouds replacing flat planes) — not yet designed
3. Lighting & shadows (soft/cascaded shadows, some GI) — not yet designed
4. Materials & reflections (smooth normals, PBR, AO, terrain blending, SSR) — not yet designed

Phases 2-4 will each go through their own brainstorming pass before they get a spec; bundling placeholder sections for them here would violate spec hygiene (no TBDs).

## Goal

Add a real post-processing compositor to ORRA without regressing render correctness, frame budget, or the existing adaptive-quality system, and without foreclosing a later move to a WebGPU/TSL-based pipeline.

## Approach

`EffectComposer` + three.js's own `jsm/postprocessing` passes, wrapped in a new `RenderPipeline` class. Two alternatives were considered and rejected for this phase:

- **WebGPURenderer + TSL node-based post-processing now** — higher ceiling (compute-shader volumetrics, better perf where supported), but WebGPU browser support isn't universal and it's a renderer-backend migration, not an additive pass. Deferred as the explicit **next planned upgrade** once this foundation exists — `RenderPipeline` is deliberately isolated behind one class so that swap doesn't ripple through the 2800-line `scene.ts`.
- **Hand-rolled single mega-shader compositor** — rejected: three.js already ships `EffectComposer`; reinventing it has no payoff.

## Architecture

A new `RenderPipeline` class in `src/world/engine/render-pipeline.ts`, owning the `EffectComposer` and its pass list.

- `OrraScene.setupRenderer()` constructs the `WebGLRenderer` as today, then constructs `RenderPipeline(renderer, scene, camera, width, height, this.activeRenderProfile)` immediately after.
- Both existing direct-render call sites (`renderer.render(scene, camera)` in the animation loop, and in the screenshot/postcard capture path) are replaced with `pipeline.render()`.
- Resize handling (`setSize` calls in the resize handler and the postcard-capture resize-restore path) additionally call `pipeline.setSize()` so the composer's internal render targets stay in sync with the canvas.
- Quality gating reuses the **existing** `RenderProfile` (`low` / `balanced` / `high`) from `performance-profile.ts` — no second tier system. `PerformanceProfile.update()` (already called every frame, already driving pixelRatio/shadows) additionally calls `pipeline.applyProfile(newProfile)` on a tier change. This keeps one authority for "how much can this frame afford," consistent with the single-authority principle already established in this codebase for weather/atmosphere state.
- `BudgetGovernor` (the vegetation/LOD frame-time controller) is untouched. Post-processing cost is fixed per tier, not fed into that governor's loop — creating a second frame-time authority reacting to the same clock is exactly the `Math.max`-style authority conflict this codebase has already been burned by once (weather state vs. rain engine) and corrected for.

## Components (pass list, in render order)

1. **`RenderPass`** (scene → camera) — replaces the raw `renderer.render()` call.
2. **`UnrealBloomPass`** (three.js stock) — threshold/strength/radius driven by quality tier. This is what makes the existing solar-yellow sun core and hot-amber corona (currently flat-lit `MeshBasicMaterial` planes) actually glow instead of reading as flat polygons.
3. **`GradeShaderPass`** (new, custom, single fragment shader) — exposure trim, lift/gamma/gain color wheels. No LUT texture asset; tunable purely in code.
4. **`FilmShaderPass`** (new, custom) — vignette + subtle grain, both toggled off entirely at `low` tier.
5. **TAA pass** (three.js stock or lightly adapted) — **required, not optional.** Adding `EffectComposer` breaks the free MSAA currently provided by `antialias: true` on the WebGL context: once `RenderPass` renders into an offscreen target instead of straight to the canvas, that native antialiasing no longer touches the final composited image. TAA replaces the antialiasing that is about to be lost, and unlocks a path to other temporal techniques later (this is a correction from an earlier draft of this plan, which incorrectly deferred AA as "already handled by MSAA").

Deliberately excluded from v1: depth of field, motion blur, SSR — these are cinematic-realism items but belong with the materials/lighting phases already deferred (3-4), not this pass.

## Data flow / integration

```
OrraScene.setupRenderer()
  -> new WebGLRenderer(...)
  -> new RenderPipeline(renderer, scene, camera, w, h, activeRenderProfile)

Per-frame (animation loop):
  PerformanceProfile.update(avgFrameMs, now) -> RenderProfile | null
    -> if changed: pipeline.applyProfile(profile)
  pipeline.render()   // replaces renderer.render(scene, camera)

Resize:
  renderer.setSize(...)
  pipeline.setSize(...)
```

`applyProfile(profile)` maps tier → pass parameters via a pure function (see Testing below), then applies those parameters to the live pass instances (enable/disable, `bloomPass.strength = ...`, etc.).

## Error handling / fallback

`RenderPipeline` probes for float-texture render target support at construction (bloom needs it; some old/integrated GPUs lack it). If unsupported, `isSupported = false` and `render()` falls straight through to `renderer.render(scene, camera)` — no composer, no crash, behaviorally identical to today.

`dispose()` tears down composer render targets and pass materials/shaders, wired into the same cleanup path `setupRenderer()` already uses to clear stale canvases on HMR / Fast Refresh.

## Testing

Tests run in `environment: "node"` with no WebGL2 context (confirmed in `vitest.config.ts` — the existing suite never calls `setupRenderer()` for exactly this reason). The GPU wiring itself (composer construction, actual `render()` call) is therefore not unit-testable here — an accepted gap identical to today's `setupRenderer()`/`WebGLRenderer` construction, not a new one introduced by this work.

What **is** testable and will be tested: the tier → pass-parameters decision is extracted as a pure function, `resolvePipelineConfig(profile: RenderProfile): PipelineConfig`, which `applyProfile()` calls internally. Tests assert the actual decisions — bloom/grain/vignette disabled at `low`, enabled with correct strength at `high`, TAA enabled at every tier — not just that construction doesn't throw. This matches the existing test-writing standard in this codebase (assert behavioral effects, not invocation).

## Out of scope for this phase

- Atmosphere/volumetrics, lighting/shadows, materials/reflections — phases 2-4, each to be brainstormed separately.
- Any change to `BudgetGovernor` or the vegetation LOD system.
- WebGPU/TSL migration — the explicit next step after this, not part of it.
