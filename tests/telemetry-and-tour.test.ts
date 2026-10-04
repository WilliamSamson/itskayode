import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getOrCreateVisitorId,
  getOrCreateSessionId,
  logWorldEvent,
} from "@/lib/telemetry";
import { STUDIO_STATIONS } from "@/world/studio/stations";

class MockStorage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe("ORRA Telemetry & Tour Systems", () => {
  let mockLocal: MockStorage;
  let mockSession: MockStorage;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLocal = new MockStorage();
    mockSession = new MockStorage();

    (globalThis as any).localStorage = mockLocal;
    (globalThis as any).sessionStorage = mockSession;
    (globalThis as any).window = {
      localStorage: mockLocal,
      sessionStorage: mockSession,
      location: { hostname: "localhost" },
    };
  });

  it("persists visitor ID in localStorage and session ID in sessionStorage", () => {
    const visitorId1 = getOrCreateVisitorId();
    expect(visitorId1).toBeDefined();
    expect(visitorId1.length).toBe(16);

    // Subsequent call returns exact same visitor ID
    const visitorId2 = getOrCreateVisitorId();
    expect(visitorId2).toBe(visitorId1);

    const sessionId1 = getOrCreateSessionId();
    expect(sessionId1).toBeDefined();
    expect(sessionId1.length).toBe(16);

    // Subsequent call returns exact same session ID
    const sessionId2 = getOrCreateSessionId();
    expect(sessionId2).toBe(sessionId1);
  });

  it("respects user telemetry consent and declines quietly when opted out", () => {
    mockLocal.setItem("ko_telemetry_consent", "declined");
    const fetchSpy = vi.spyOn(global, "fetch");

    logWorldEvent("orra_tour_started", { step: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("dispatches telemetry payloads with appropriate Firestore types when enabled", () => {
    mockLocal.setItem("ko_telemetry_consent", "accepted");
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-key";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    logWorldEvent("station_focused", {
      stationId: "advanced-tech-lab",
      step: 2,
      durationSec: 14.5,
      isInteractive: true,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("test-project");
    expect(url).toContain("test-key");

    const body = JSON.parse(options?.body as string);
    expect(body.fields.eventName.stringValue).toBe("station_focused");
    expect(body.fields.stationId.stringValue).toBe("advanced-tech-lab");
    expect(body.fields.step.integerValue).toBe("2");
    expect(body.fields.durationSec.doubleValue).toBe(14.5);
    expect(body.fields.isInteractive.booleanValue).toBe(true);
  });

  it("ensures key tour stations exist in the station registry", () => {
    expect(STUDIO_STATIONS["advanced-tech-lab"]).toBeDefined();
    expect(STUDIO_STATIONS["power-grid"]).toBeDefined();
    expect(STUDIO_STATIONS["command-desk"]).toBeDefined();

    expect(STUDIO_STATIONS["advanced-tech-lab"].label).toBe("Advanced Tech Lab");
    expect(STUDIO_STATIONS["power-grid"].label).toContain("Power Grid");
    expect(STUDIO_STATIONS["command-desk"].label).toBe("The West Pavilion");
  });

  it("differentiates tour viewing status between unviewed, dismissed, and completed", async () => {
    const { getTourState, saveTourState } = await import("@/world/hud/orra-tour-guide");

    // 1. Initial fresh visitor is unviewed
    expect(getTourState().status).toBe("unviewed");

    // 2. Dismissing / skipping saves dismissed status without marking completed
    saveTourState({
      status: "dismissed",
      step: 0,
      dismissedAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(getTourState().status).toBe("dismissed");

    // 3. Completing all steps marks as completed
    const completionTimestamp = Date.now();
    saveTourState({
      status: "completed",
      step: 4,
      completedAt: completionTimestamp,
      updatedAt: completionTimestamp,
    });
    const state = getTourState();
    expect(state.status).toBe("completed");
    expect(state.completedAt).toBe(completionTimestamp);

    // 4. Legacy migration: if only old boolean key exists, resolves to completed
    mockLocal.clear();
    mockLocal.setItem("orra_tour_seen", "true");
    expect(getTourState().status).toBe("completed");
  });
});
