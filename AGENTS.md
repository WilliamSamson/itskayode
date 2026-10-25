# itskayode — Design & Engineering Guidelines

Two surfaces share this repo: the **portfolio** (`src/app`, `src/components`) and **ORRA**, a living floating island rendered in Three.js (`src/app/orra`, `src/world`). They share a voice. They do not share a visual language.

Rules here are imperatives. Each carries its reason in a line, because a rule without its reason gets "improved" away. Where a number matters, the code owns it, and this file points to where it lives rather than copying it.

---

## 1. Design direction

### 1.1 The portfolio: architectural calm

The feeling is an engineer's drawing set: solid, measured, quietly confident. Structure comes from hairlines, columns and whitespace, not from boxes and effects. One warm living element (the portrait aura) keeps it from feeling clinical.

- **Anchor page:** About. When unsure how something should look, make it look like it belongs there.
- **Signatures, used once each:** the morphing **image aura** behind portraits and key media, and the high-contrast **floating dock** (`bg-text/95`, blurred, `rounded-full`). If a new element competes with either, it is too loud.
- **Anti-goals:** dashboard-card grids, gradient washes, glassmorphism stacks, badge confetti, "tech" décor (fake terminals, scanlines, pulsing status dots).

### 1.2 ORRA: a diorama in the void

The island is a small, finished world suspended in space, so the camera always reads it as an object you could hold. All colour belongs to the world (turf, rock, weather, sky). The interface is a black instrument laid over it (§3).

- **Signature:** the island's silhouette. That is a green lawn rolling over a lip into a deep rock keel that ends in a hanging spire, framed by stars and an asteroid belt. Protect that silhouette above any single detail.
- **Anti-goals:** game-HUD clutter, rainbow telemetry, weather that hides the world, geometry that reads as extruded or procedural.

### 1.3 Voice (both surfaces)

- Write like an experienced engineer talking to a peer: plain, specific, confident.
- **Banned registers:** pseudo-military, bureaucratic or sci-fi (`Clearance`, `Directive`, `Initializing Synaptic Link`, `TLS SECURE`).
- **Actions are verbs:** `Explore projects`, `Read case study`, `Send message`, `Request CV`.
- **Labels are sentence case:** `Selected work`, `Engine telemetry`. No `UPPERCASE TRACKING-WIDEST` micro-labels.
- **No emoji.** Icons come from `lucide-react`.

---

## 2. Portfolio system

### 2.1 Tokens

Never hardcode hex values or uncalibrated opacities in UI components. Tokens are CSS variables in `src/app/globals.css`, exposed through `tailwind.config.ts`.

| Role | Tokens |
|---|---|
| Canvas / surface / raised | `bg-bg`, `bg-surface`, `bg-elevated`, `hover:bg-elevated-hover` |
| Inverted (dock, primary controls) | `bg-text` with `text-bg` |
| Text hierarchy | `text-text` → `text-primary-subtle` → `text-primary-dim` |
| Hairlines | `border-border-subtle` (dividers), `border-border` (default), `border-border-strong` (focus/active) |
| Accents | `accent-blue`, `accent-green`, `accent-orange`, `accent-violet`, `accent-red` |
| Radii | `rounded-xl` panels, `rounded-md` controls, `rounded-full` dock and pills |

**Accents mean something.** One accent per context, used to mark a category, a metric or the primary action. Two saturated accents side by side without hierarchy is noise.

### 2.2 Typography

- **Pairing:** `font-heading` for titles (currently Outfit, `font-semibold tracking-tight`) and `font-sans` for body and metadata (currently Inter).
- **Load every font you name.** Fonts come in through `next/font`; a family that only appears in a CSS stack silently falls back to system fonts for most visitors.
- **Mono is for code** and message templates only. Numbers that must align use `tabular-nums`, not a mono face.
- **Scale:**
  - Hero and page titles: `font-heading text-[clamp(2.25rem,5.5vw,3.75rem)] font-semibold tracking-tight`
  - Section titles: `font-heading text-lg sm:text-xl font-semibold tracking-tight`
  - Item titles: `text-[15px] font-semibold`
  - Body: `text-[13px] leading-relaxed text-text/70`
  - Meta: `text-[11px] font-medium text-text/50`

### 2.3 Composition

- **Rows, not nested cards.** Group with `border-border-subtle` hairlines and space. A card inside a card inside a card is a rewrite.
- **Flat text tabs.** The active tab is `text-text`; inactive tabs are `text-primary-dim hover:text-primary-subtle`, with `gap-4`. Segmented pill controls belong only on the dock.
- **Fluid by default.** Size type, gaps and media with calibrated `clamp()`, e.g. `gap-[clamp(2rem,5vw,4.5rem)]` or `max-h-[clamp(240px,36vw,420px)]`. Breakpoints adjust composition; they are not the sizing system.
- **Cap line length.** Wrap layouts in `max-w-6xl` / `max-w-7xl mx-auto`.

### 2.4 Responsive spectrum

The viewport controls composition, not only column count. Nothing (aura, showcase, dock) may dominate or feel cramped at any size or height.

| Range | Behaviour |
|---|---|
| < 380 px | Compact padding, secondary metadata dropped, 44 px+ tap targets, no horizontal overflow |
| 380–600 px | Single column, steady reading rhythm |
| 600–1024 px | Asymmetric two-column reflows, whitespace kept |
| Height < 750 px | Hero visual and portrait shrink so headline, body and CTAs fit the first view |
| > 1440 px | Max-width containers; nothing stretches edge to edge |

### 2.5 Motion

- Calm and physical: springs, small elevations, the aura's slow morph. One orchestrated entrance beats many scattered effects.
- **Every animation has a reduced-motion path.** Add a freeze or bypass under `@media (prefers-reduced-motion: reduce)` in `src/app/globals.css`, in the same change as the animation.
- `tailwindcss-animate` is not installed, so `animate-in`, `fade-in` and `slide-in-from-*` do nothing. Don't use them.

---

## 3. ORRA interface

The HUD is an instrument laid over an open world, not a game overlay. Its language is set by the dock: solid black pills, `lucide-react` icons, neutral text, and a white pill for whatever is on. Refine that language; don't replace it.

### 3.1 Two surfaces, nothing else

- **The island** (`hud/world-island.tsx`), top centre: one black pill that morphs (layout spring) with what it has to say.
  - **At rest:** sky icon, season, clock.
  - **Tapped:** adds the day, pause, speed (one to four chevrons, never a `5x` chip) and, only when the clock has drifted from local time, a return to it.
  - **Room in focus:** the room name and subtitle, its light and exit. Room-specific controls take a second row inside the same surface; never a second pill.
- **The dock** (`engine-hud.tsx`), bottom centre, icon-only: pan, orbit, views, weather | zoom in/out | engine, about, leave.
- **Keys:** `V` views, `W` weather, `~` engine, `I` about, `P` cycle perspective, `+`/`-` zoom, letter shortcuts for rooms, `Esc` closes.
- **Controls that duplicate another path are removed, not restyled:** theme toggle, reset view, the LIVE/CUSTOM badge and the `1x` chip.

### 3.2 Visual language

- **Solid black, one hairline** (`bg-black border border-neutral-800`). No translucency, blur, cards-inside-pills, dots, gradients or neon.
- **Icons are `lucide-react`, icon-only.** No custom icon sets and no text labels under dock icons; tooltips and `aria-label` carry the words.
- **Active is a white pill** (`bg-white text-black`). Room lights that are on use `text-amber-300`.
- **Type:** sentence-case sans (`text-[13px] font-semibold` for names, `text-[11px] text-neutral-400` for secondary), `font-mono tabular-nums` for the clock and live numbers. No expanded or uppercase display type in the HUD; the title screen owns that voice.

### 3.2.1 Reading a panel (drawers)

- **Units are the labels:** `214m`, `16.6ms`, `60fps`. Drop `Alt:` when `m` already says it.
- **Mono for live numbers, sans for words:** `font-mono tabular-nums` for values that change every frame; sentence-case sans for everything else.
- **One text size per role.** `11px`/`10px`/`9px` in one panel means priority was shrunk instead of decided.
- **No abbreviations to save space** (`res`, `warm`, `queue`), no `label: value` dumps, no uppercase mono as decoration.

### 3.3 Honesty

- **Render every value you compute, or delete it.** A prop threaded into the HUD and never drawn breaks the contract; so does a stat that quotes a constant instead of measuring the scene (`OrraScene.measureIsland` exists for exactly this).
- **The HUD reads the same authority the world does** (§5.3). A panel describing rain under a clear sky is a bug.
- **Poll only what is visible, at display precision.** The engine drawer polls stats only while open; the viewport sets state only when a displayed value changes. A 350 ms poll that builds new objects re-renders the whole tree forever.

---

## 4. ORRA art direction

### 4.1 The island mass

The landmass lives in `src/world/studio/terrain/island-mass.ts`. It is one source of truth for three consumers: the mesh, the grass planting (`LIP_OUTLINE` via the exclusion registry) and `surfaceY`.

- **Plateau:** exactly the building footprint, and perfectly flat. Nothing built on it may tilt or float.
- **Shoulder:** the lawn rolls *outward* past the plateau over a rounded bullnose, then meets the rock at the lip. The turf always overhangs the rock, never the reverse.
- **Soil band:** a dark root layer between turf and rock. Its depth varies smoothly per column. A stepped or uniform band reads as a layer cake.
- **Keel:** a cliff for its first third, then an inverted mountain tapering to a hanging **spire**.
  - Depth/width stays in roughly 0.4–0.6. Below ~0.2 the island reads as a slab.
  - All columns converge inside the spire's small fixed radius. Converging across the whole underside draws a pinched fan.
  - Underside depth is a function of world position only, so converging columns always agree. Per-column depth terms twist the underside.
- **Rock character:** ray-aligned crag noise, vertical erosion ribs, ridged crests and warped bedding shelves. Detail fades by absolute radius, so the spire tip stays clean.

### 4.2 Surfaces

- **Rock** (`rock-material.ts`):
  - Macro colour is baked per vertex: strata tones, cooler and darker with depth and on the underside, moss on upward ledges near the lip, crevice shading.
  - Grain is sampled triplanar in world space, because UVs on a keel smear down tall walls and swirl at the tip.
  - Architectural materials (formwork concrete, tie-holes) never go on natural rock.
- **Turf** carries the lawn's texture; the grass clumps carry its volume. Planting follows the shoulder down to the lip.

### 4.3 Vegetation

- **Vines** (`island-vines.ts`): bundles of a thick main stem plus thinner companions.
  - Each vine roots in the turf, drapes over the lip, then falls under gravity.
  - The rock may push a vine outward and it then hangs plumb below the contact. Nothing ever passes through stone.
  - Companions split from the stem below the lip, on the outward side only.
- **Variation lives per instance:** colour through `setColorAt` (with `instanceColor.needsUpdate` on every re-pack) and proportion through non-uniform scale. Uniform `scale.set(s, s, s)` reads as one plant zoomed.
- **Luminance varies more than hue.** A wide hue spread gives a fruit-salad lawn.
- **Placement respects the ground:** slope from the height field's gradient, never a positional sinusoid.

### 4.4 Atmosphere

- **Weather is permeable.** It veils distance, never the foreground: fog keeps a crisp near field, and rain curtains stay faint enough that discrete streaks carry the effect. The moment a flat sheet is noticeable on its own, it reads as a scrim in front of the camera, not rain you see the world *through*.
- **Fog responds to visibility across its whole range.** Calibration lives in `OrraScene.fogRange`; its tests assert both that dense fog closes in and that the island stays readable. Change the numbers only with those tests.
- **Near and far use different curves.** Far falls off much faster than linearly, the way extinction does.
- **Fog scatters light.** Mist lifts toward grey; it never darkens toward the void. Test colour branches most-specific first (fog before overcast).
- **Altitude makes fog a place:** valley fog pools under an inversion ceiling, and climbing breaks you out of it.
- **Slow air:** two incommensurate low-frequency terms on density keep it drifting without a visible loop.
- **God rays** (`god-ray-system.ts`):
  - Shafts are parallel to the live key light, and density fades to zero at the local radius.
  - A Henyey-Greenstein phase (g ≈ 0.76) makes them bright toward the sun and faint away from it.
  - Shafts fade at ground and near camera: depth test on, depth write off.
  - The group is hidden at zero gain.
- **ORRA is presented in space.** Day and night come from the world clock and the celestial system, not from a theme switch. The engine still supports a daylight theme (`setWorldTheme`), but no visitor control exposes it.

---

## 5. World engineering rules

Every rule here was learned by shipping its violation.

### 5.1 Determinism and noise

- **Same seed, same world.** No `Math.random()` in generation or meshes. Seeds come from coordinates via `hash01` (`src/world/math/hash.ts`), with a distinct salt per property; reusing a salt correlates height with girth.
- **Integer-hash noise only** (`src/world/math/noise.ts`: `valueNoise3`, `fbm3`, `loopNoise`), because sin-hash bands far from the origin. Keep the quintic fade, normalise fbm by total amplitude, and keep lacunarity irrational (2.02).
- **No raw sinusoids as spatial fields.** `sin(x) + cos(z)` is periodic and reads as artificial; use warped fbm. Sinusoids are fine as 1-D *temporal* envelopes (sway, breathing air).
- **Closed loops use loop noise.** Noise along an outline samples a circle, so it is seamless where the loop joins.

### 5.2 Calibrate against the measured field

**This is the rule most often broken by confident reasoning.** A threshold chosen from real-world intuition is calibrated to the wrong world: it either never fires or always fires, and both look like "low quality" rather than like a bug.

- Before choosing a threshold or range against a procedural field, sample the real domain, print percentiles, pick the number, and **record the measurement and date in a comment** (see `spread()` in `island-mass.ts`).
- Value-noise fbm never spans [0, 1], and each series spans a different part of it, so stretch each by its own measured p1..p99.
- **Re-measure whenever the field or the world's scale changes.** A constant right at one scale is dead or saturated at another.
- **Clamps must not swallow their signal.** `Math.max(floor, computed)` that always returns `floor` makes the input decorative. Print the output across the input range before believing a parameter does anything.

### 5.3 One authority per property

- Each world property (precipitation, fog colour, season) has exactly one authoritative system. Others add detail inside its envelope and are scaled by an authority factor.
- `Math.max(a, b)` or `a || b` over two independently updated simulations is almost always this bug: ask whether `b` can be non-zero when `a` says zero.
- Derive authority from **interpolated** state, not preset names, so effects fade with transitions instead of cutting off.
- **Park a subordinate system when its authority is zero:** gate its output, freeze its lifecycle, keep draining its accumulated state (wet ground must still dry).
- **Season is the weather's authority** (`climate-weather.ts`):
  - Draws are seeded per spell from world time, and scrubbing never reshuffles them.
  - Time of day can veto a draw (fog burns off by mid-morning).
  - A manual pick suspends the scheduler.

### 5.4 State and time

- **A rate multiplies a delta, never a total.** `total * currentRate` jumps when the rate changes and runs backwards when it drops. Accumulate: `progress += delta * rate`.
- Keep calendar time and process time separate. Scrubs advance both.
- **The calendar is anchored to real dates** (`world-clock.ts`). Live time is whole local calendar days since `ORRA_EPOCH` plus the local time of day, so a world day turns at local midnight and seasons turn every eight real days. Count days from calendar dates, never elapsed ms / 86,400,000, which gains or loses a day at daylight-saving changes.
- **Only `syncToLive` returns to local time.** Pausing, speeding up, scrubbing and skipping make the clock custom, and returning to 1x continues from where the world got to.
- **Feed the clock true elapsed time,** not the capped physics `dt`, or the world stops while its tab is hidden.
- **Persist a validated snapshot** (`ClockSnapshot`) on every clock change and on `pagehide`/hidden. On return, time away passes at 1x; fast-forward is for watching.
- **Any slow process states its completion time in real seconds at the fastest time scale, in a test.** A life cycle nobody can watch does not exist.

### 5.5 Shared ground and placement

- **One footprint definition, many readers.** The island outline lives in `island-mass.ts`; nothing else keeps its own copy. Shared world positions are named static constants on their owner.
- **Test spans, not centres.** Assert across an object's full extent and all four footprint corners; a 200 m road is only as good as its worst metre.
- **Overlapping influence resolves by distance, never by array order.**
- **Exclusion is two-sided:** nothing grows on built ground, *and* ordinary ground just outside still grows. A one-sided test passes while the district sits in a dead ring.

### 5.6 Geometry you can trust

- **Displace along rays that cannot cross.** The keel moves vertices only along each column's ray from `KEEL_CENTRE`, which preserves ring order; whole-ring translations (the spire's lean) move every vertex of a ring together.
- **Clamp to the real boundary.** Where an outline is only barely star-shaped, clamp to the ray's *first* exit (`SAFE_REACH`), then verify.
- **Prove the invariants in tests,** because each of these was broken while its code looked right:
  - no ring self-intersects,
  - no rock past the lip,
  - the wall hugs the lip (a distribution bound, not one max),
  - no vine point inside rock (raycast outward: a back-face hit means inside),
  - the plateau is exactly flat.

### 5.7 Performance is a budget

Measure before and after, on integrated graphics, with `renderer.info` and timed renders. The known costs and their controls:

- **Lights:** three.js shades every visible light on every fragment and compiles them into every shader. Local lights go through the **light pool** (`engine/light-pool.ts`): a fixed set of slots follows the fixtures nearest the view. Never change the live light count at runtime, because that recompiles every material.
- **Draw calls:** static details merge through `static-mesh-batcher.ts`. It keys materials by look, and bakes colour, roughness, metalness and emissive into vertices. Build materials that can merge: no per-mesh `onBeforeCompile` on static props, no `userData` on meshes you expect merged.
- **Big instanced fields are tiled** so frustum culling has units to cull. Grass tiles pick an LOD by distance.
- **Quality tiers scale real costs** (`OrraScene.QUALITY_BUDGETS`): grass LOD and cull distance and asteroid update stride, not only pixel ratio and shadows.
- **Shadows re-render only when needed** (`OrraScene.shadowRefreshDue`): when the view settles, when it nears the map's edge, or when the sun moves (throttled).
- **Distant slow motion updates round-robin.** Asteroids take turns across frames, with spin computed from elapsed time so skipped frames lose nothing.
- **No per-frame allocation in the loop** (`new THREE.Color` inside `animate` is a leak with a frame rate).

### 5.8 Camera

- Pitch stays within `PITCH_BOUNDS` (18°–82°), so the camera is always above its target. The look target stays over the island (`MAX_TARGET_RADIUS`), and ground clearance constants live on `WorldNavigationController`.
- Visitors see the underside mostly in silhouette from the side. Judge keel changes from low side angles as well as from below.

---

## 6. Tests and verification

- **Commands:**
  - Typecheck: `npm run typecheck`
  - Tests: `npm test`
  - Lint: `npm run lint`
  - **Never run `npm run build` or `next build` during development turns.**
- **Assert behaviour, not invocation.** Every threshold, clamp and exclusion gets a **two-sided** test: it holds, *and* it bites. The second assertion is the one that catches a dead rule.
- **A field computed but never read is a feature that does not exist.** For any per-instance or per-frame field, grep for reads, not writes, and write the consumer in the same change.
- Anything visible gets checked in the running app from the angles that matter (for the island: high three-quarter, low side, below), in both themes and in clear weather.

## SONARIS presentation guardrails

- SONARIS is its own product identity, not portfolio-branded content: use its PNG logo, signature red, standalone metadata title, favicon and social preview on `/sonaris`. Preserve the portfolio identity elsewhere. Assets live in `public/sonaris/brand/`; keep original Downloads files untouched.

- User correction (2026-10-21): use an S2 30 m **2D** LiDAR on a mechanically tilting mount, not an A2M12 or native 3D LiDAR. Any 3D output is reconstructed from tilted 2D scan planes. Keep the approved rover motion; use OLED-black canvas/stage and a true deep red rather than purple.

- Preserve the approved SONARIS composition, expressive orange/amber/wine palette, rover illustration and personality. Do not reinterpret a cleanup request as a minimalist redesign or replace the illustration with a generic schematic.
- Cleanup means removing unsupported claims and unnecessary decorative details, not stripping intentional art direction. Ask before materially changing layout, palette or rover appearance.
- Centralize approved colours as semantic tokens without changing their rendered values. Geometry constants are legitimate illustration data, not UI colour violations.
- Distinguish proposed capabilities, targets, simulations and measured results. Confirm disputed specifications with the user; do not manufacture benchmarks, telemetry or downloads.
- Reusable prompt: `Preserve the existing SONARIS visual identity. Make only the requested cleanup, centralize approved colours without visual changes, and verify the before/after appearance.`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


### SONARIS engineering workspace

- `/sonaris/workspace` is a local design and simulation environment, not a connected rover or authoritative Onshape document. Preserve the landing page's visual identity and separate product metadata.
- The uploaded 2026-10-21 workspace brief supersedes stale P2/A2M12 assumptions. Use SONARIS and the mechanically tilting S2 2D LiDAR. Component models start with unknown envelopes, not guessed chassis dimensions.
- Every numerical result must name its source: proposal, user assumption, analytical simulation or user-declared physical test. Unknown geometry is a staged inventory marker; an entered box is an envelope, not manufacturer CAD.
- Keep persistence/import validation in `src/sonaris/lib/sonaris-workspace-state.ts`; never overwrite an invalid stored snapshot automatically. Import must clear prior project settings and local CAD references. Export before moving browsers; this workspace does not synchronize a team backend.
- Engineering formulas belong in the tested `sonaris-engine.ts` / `sonaris-analysis.ts` modules. Changing an input must change the actual renderer or calculation. Save the inputs alongside calculated results. Do not present nominal voltage checks, envelope collision checks or heuristic coverage as complete electrical, structural or mapping validation.
- Restore files through the task's recorded rollback, not a blanket Git reset; unrelated user changes exist.
