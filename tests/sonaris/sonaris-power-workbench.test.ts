import { describe, expect, it } from "vitest";
import {
  ROVER_ELECTRONICS,
  MISSION_PROFILES,
  BATTERY_SOC_CURVES,
  SUB_CIRCUITS,
  POWER_CONNECTIONS,
  BENCHTOP_POSITIONS,
  CHASSIS_POSITIONS,
  calculateWireDrop
} from "@/sonaris/components/workspace/power-workbench";

describe("SONARIS Power Workbench & Electronics Subsystem", () => {
  it("defines comprehensive electronics nodes across energy, protection, conversion, actuation, compute, and sensing", () => {
    expect(ROVER_ELECTRONICS.length).toBeGreaterThanOrEqual(10);

    const ids = ROVER_ELECTRONICS.map((node) => node.id);
    expect(ids).toContain("battery");
    expect(ids).toContain("fuse-block");
    expect(ids).toContain("disconnect");
    expect(ids).toContain("estop");
    expect(ids).toContain("contactor");
    expect(ids).toContain("converter-a");
    expect(ids).toContain("driver-1");
    expect(ids).toContain("driver-2");
    expect(ids).toContain("servo");
    expect(ids).toContain("pi5");
    expect(ids).toContain("pico");
    expect(ids).toContain("lidar");
    expect(ids).toContain("imu");
  });

  it("verifies every electronics component has explicit pinout mappings and research notes", () => {
    ROVER_ELECTRONICS.forEach((node) => {
      expect(node.name.length).toBeGreaterThan(0);
      expect(node.rail).toBeDefined();
      expect(node.connector.length).toBeGreaterThan(0);
      expect(node.wireGauge.length).toBeGreaterThan(0);
      expect(node.wireLengthM).toBeGreaterThan(0);
      expect(node.pinouts.length).toBeGreaterThanOrEqual(2);
      expect(node.researchNote.length).toBeGreaterThan(20);
      expect(node.thermalThetaJA).toBeGreaterThan(0);
    });
  });

  it("provides authentic mission profiles with correct power load profiles", () => {
    expect(MISSION_PROFILES.length).toBeGreaterThanOrEqual(5);

    const boot = MISSION_PROFILES.find((p) => p.id === "boot");
    const eStop = MISSION_PROFILES.find((p) => p.id === "estop");
    const cruise = MISSION_PROFILES.find((p) => p.id === "cruise");
    const thrust = MISSION_PROFILES.find((p) => p.id === "thrust");

    expect(boot).toBeDefined();
    expect(eStop).toBeDefined();
    expect(cruise).toBeDefined();
    expect(thrust).toBeDefined();

    // E-Stop must drop drive rail to 0V while keeping logic rail powered (5.1V)
    expect(eStop!.eStopActive).toBe(true);
    expect(eStop!.driveRailV).toBe(0.0);
    expect(eStop!.logicRailV).toBeGreaterThanOrEqual(5.0);

    // Max thrust has highest dynamic power
    expect(thrust!.powerW).toBeGreaterThan(cruise!.powerW);
  });

  it("calculates realistic copper wire resistance and voltage drop", () => {
    // 14 AWG wire, 0.25 meters, 10 Amperes current
    // 14 AWG copper is approx 8.28 milliohms per meter
    const drop = calculateWireDrop("14 AWG", 0.25, 10);
    expect(drop.resistanceMilliOhms).toBeGreaterThan(1);
    expect(drop.resistanceMilliOhms).toBeLessThan(10);
    expect(drop.voltageDropV).toBeGreaterThan(0.01);
    expect(drop.voltageDropV).toBeLessThan(0.1);
  });

  it("accurately models LiFePO4 battery state-of-charge curve", () => {
    expect(BATTERY_SOC_CURVES.length).toBeGreaterThanOrEqual(4);

    const full = BATTERY_SOC_CURVES.find((s) => s.soc === 100);
    const plateau = BATTERY_SOC_CURVES.find((s) => s.soc === 75);
    const cutoff = BATTERY_SOC_CURVES.find((s) => s.soc === 0);

    expect(full!.openCircuitV).toBeGreaterThan(13.8);
    expect(plateau!.openCircuitV).toBeCloseTo(12.8, 1);
    expect(cutoff!.openCircuitV).toBeLessThanOrEqual(10.5);
  });

  it("includes circuit breaker and protection interlock controls", () => {
    expect(SUB_CIRCUITS.length).toBeGreaterThanOrEqual(4);
    const breakers = SUB_CIRCUITS.map((c) => c.id);
    expect(breakers).toContain("drive-bus");
    expect(breakers).toContain("logic-bus");
    expect(breakers).toContain("lidar-rail");
  });

  it("defines authentic 3D spatial layout positions for both benchtop testbed and installed chassis", () => {
    expect(BENCHTOP_POSITIONS.battery).toBeDefined();
    expect(BENCHTOP_POSITIONS.pi5).toBeDefined();
    expect(BENCHTOP_POSITIONS["converter-a"]).toBeDefined();
    expect(BENCHTOP_POSITIONS["driver-1"]).toBeDefined();
    expect(BENCHTOP_POSITIONS.lidar).toBeDefined();
    expect(BENCHTOP_POSITIONS.estop).toBeDefined();

    expect(CHASSIS_POSITIONS.battery).toBeDefined();
    expect(CHASSIS_POSITIONS.pi5).toBeDefined();

    // Verify 3D wire connections connect valid ports between physical twins
    expect(POWER_CONNECTIONS.length).toBeGreaterThanOrEqual(10);
    const batteryConn = POWER_CONNECTIONS.find((c) => c.fromPart === "battery");
    expect(batteryConn).toBeDefined();
    expect(batteryConn!.toPart).toBe("protection");
  });
});
