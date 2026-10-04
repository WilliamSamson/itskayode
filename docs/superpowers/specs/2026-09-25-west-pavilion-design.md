# Specification: The West Pavilion (Monolithic Minimalist Living Lounge)

## 1. Overview & Context
Replace the traditional corporate "Executive Office" at the western endcap of the main campus (`x ≈ -21.2, z ≈ 0.1`) with **The West Pavilion**—a large, spacious, "new money" minimalist living room. 

The space draws inspiration from contemporary architectural hillside penthouses and private pavilions: deep negative space, monolithic materials (Nero Marquina marble, fluted basalt, brushed dark bronze), low-slung seating in charcoal wool, and a seamless linear ribbon flame fireplace overlooking the cosmic void.

---

## 2. Spatial Composition & Geometry

### 2.1 Location & Footprint
- **Anchor Coordinate**: `[-21.2, 0, 0.1]`
- **Orientation**: Panoramic floor-to-ceiling glass on the West wall (`x = -26.0`) looking directly into cosmic space and the floating island rim.
- **Entry Spur**: South-facing gallery entrance from the central campus spine (`x = -17.075` to `-21.2`).

### 2.2 Interior Architectural Elements
1. **Foundation Rug**:
   - Expansive 7.2m x 5.8m architectural wool rug in matte graphite (`0x1b1f23`, roughness 0.95), grounding the living pavilion.
2. **Low-Slung Modular Sectional**:
   - Massive L-shaped contemporary sofa in charcoal woven cashmere/wool (`0x181c20`, roughness 0.85).
   - Low seat height (0.38m) with deep 1.1m seat cushions, chaise lounge extension, and architectural backrests.
   - Integrated warm amber under-glow LED ribbon (`0xffb21a`, intensity 0.8, distance 3.5m) illuminating the floor float gap.
3. **Monolithic Nero Marquina Marble Coffee Table**:
   - Heavy, low-profile slab table (`2.4m x 1.2m x 0.32m`) in honed black stone with subtle pale veining.
   - Topped with stacked oversized architectural hardcover monographs and a heavy matte bronze sculptural bowl (`0x9c6b2f`).
4. **Recessed Linear Ribbon Fireplace**:
   - Built flush into the north feature wall: 3.6m wide horizontal firebox framed in dark fluted basalt.
   - Glowing ember bed with flickering amber point lights (`0xff8822`, intensity 1.4) producing warm dynamic hearth light.
5. **Floating Bar & Hospitality Credenza**:
   - Low floating credenza (`2.8m x 0.5m x 0.65m`) in dark smoked glass and brushed blackened bronze.
   - Houses sculpted crystal decanters, tumblers, and low ambient hospitality lighting.
6. **Sculptural Cantilevered Arch Lamp**:
   - Minimalist matte-black steel arch rising from behind the sectional and sweeping overhead with a soft downward warm diffuser.

---

## 3. UI, Navigation & Telemetry Integration

- **Station Registry (`src/world/studio/stations.ts`)**:
  - `id`: `"command-desk"` (preserved for backward compatibility with tests and saved camera states)
  - `label`: `"The West Pavilion"`
  - `worldPosition`: `[-21.2, 0.9, 0.1]`
  - `cameraOffset`: `[3.2, 2.0, 3.2]` (optimized wide-angle living lounge perspective)
- **HUD Drawer (`src/world/hud/engine-hud.tsx`)**:
  - Perspectives Drawer: Update label to `"The West Pavilion"` (<kbd>E</kbd> shortcut).
  - Lighting Circuit: Toggles ambient lounge spots, fireplace embers, and under-sofa glow.
- **Tour Guide (`src/world/hud/orra-tour-guide.tsx`)**:
  - Step 2 quick-jump button updated from `"Executive Office"` to `"West Pavilion"`.
- **Hit Volumes & Defocus**:
  - Clickable interactive bounding box updated to wrap the pavilion lounge grouping.

---

## 4. Verification & Testing

1. `tests/world.test.ts`: Verify station perspective lookup and hit tests pass.
2. `tests/telemetry-and-tour.test.ts`: Verify `STUDIO_STATIONS["command-desk"]` exists with label `"The West Pavilion"`.
3. `npm run typecheck`: Ensure 0 TypeScript errors.
4. `npm test`: Verify all 113+ tests pass.
5. `npm run build`: Verify clean Next.js production build.
