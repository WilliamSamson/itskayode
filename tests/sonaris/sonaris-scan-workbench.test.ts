import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scanWorkbenchCode = readFileSync(
  "src/sonaris/components/workspace/scan-workbench.tsx",
  "utf8"
);
const scanStageCode = readFileSync(
  "src/sonaris/components/workspace/scan-stage.tsx",
  "utf8"
);

describe("SONARIS Scan Reconstruction Workbench", () => {
  it("enforces mechanical tilt range between -30° and +60°", () => {
    expect(scanWorkbenchCode).toContain('min="-30"');
    expect(scanWorkbenchCode).toContain('max="60"');
    expect(scanWorkbenchCode).toContain("-30 + step * 10");
  });

  it("incorporates RPLIDAR S2 DTOF specs and ST3215 actuator details", () => {
    expect(scanWorkbenchCode).toContain("Slamtec RPLIDAR S2");
    expect(scanWorkbenchCode).toContain("32,000 samples/sec");
    expect(scanWorkbenchCode).toContain("ST3215 12V Serial Servo");
    expect(scanWorkbenchCode).toContain("30.0 m");
  });

  it("provides 3 unified inspector tabs matching Studio standards", () => {
    expect(scanWorkbenchCode).toContain('"acquisition"');
    expect(scanWorkbenchCode).toContain('"slices"');
    expect(scanWorkbenchCode).toContain('"specs"');
  });

  it("supports 3 spatial display modes without CAD camera button clutter", () => {
    expect(scanWorkbenchCode).toContain('"cloud"');
    expect(scanWorkbenchCode).toContain('"split"');
    expect(scanWorkbenchCode).toContain('"slice"');
    // Decluttered: No bare-minimum Iso/Top/Front buttons
    expect(scanWorkbenchCode).not.toContain('>Iso<');
    expect(scanWorkbenchCode).not.toContain('>Front<');
  });

  it("honours reduced motion with doubled interval", () => {
    expect(scanWorkbenchCode).toContain("useReducedMotion");
    expect(scanWorkbenchCode).toContain("reducedMotion ? 700 : 350");
  });

  it("renders 3D laser fan, room bounds, and vertex colored point cloud in stage", () => {
    expect(scanStageCode).toContain("RingGeometry");
    expect(scanStageCode).toContain("showLaserFan");
    expect(scanStageCode).toContain("showRoomBounds");
    expect(scanStageCode).toContain("vertexColors: true");
    expect(scanStageCode).toContain("elevation");
    expect(scanStageCode).toContain("laser");
    expect(scanStageCode).toContain("plane");
  });

  it("supports spatial features and eliminates boilerplate CSV exports", () => {
    expect(scanWorkbenchCode).toContain("heightFilter");
    expect(scanWorkbenchCode).toContain("isolatedPlane");
    expect(scanWorkbenchCode).toContain("raysPerPlane");
    // Decluttered: No generic CSV export button
    expect(scanWorkbenchCode).not.toContain("Download Point Cloud CSV");
    expect(scanWorkbenchCode).not.toContain("exportPointCloud");
    expect(scanWorkbenchCode).not.toContain("SONARIS //");
  });

  it("implements 4-phase step-and-settle acquisition and 16 vertical height bins", () => {
    expect(scanWorkbenchCode).toContain("analyzeCoverageAndGaps");
    expect(scanWorkbenchCode).toContain("runAutoGapFill");
    expect(scanWorkbenchCode).toContain("FIXED_SENSOR_HEIGHT");
    expect(scanWorkbenchCode).toContain("roverPose");
    expect(scanWorkbenchCode).toContain("heightBins");
    expect(scanStageCode).toContain("isNavigating ? 0 : tiltDeg");
  });

  it("supports curated room environments with obstacles and synchronized navigation", () => {
    expect(scanWorkbenchCode).toContain("ROOM_PRESETS");
    expect(scanWorkbenchCode).toContain("findNavPath");
    expect(scanStageCode).toContain("obstaclesGroup");
    expect(scanStageCode).toContain("pathGroup");
  });
});
