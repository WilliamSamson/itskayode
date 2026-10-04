export type RenderQuality = "low" | "balanced" | "high";
export type DeviceCategory = "phone" | "tablet" | "desktop";

export interface RenderProfile {
  quality: RenderQuality;
  pixelRatio: number;
  shadows: boolean;
  deviceCategory: DeviceCategory;
}

/**
 * PerformanceProfile
 * ==================
 * Dynamically adapts the render pipeline to device capabilities.
 * Specifically handles high-resolution tablets (e.g. Samsung Galaxy Tab, iPad),
 * mobile phones, and desktop GPUs, balancing crisp geometry with fluid 60 FPS framerates.
 */
export class PerformanceProfile {
  private quality: RenderQuality;
  private lastChangeMs = 0;
  public readonly isTablet: boolean;
  public readonly isPhone: boolean;
  public readonly isMobileOrTablet: boolean;

  constructor(width: number) {
    const nav = typeof navigator === "undefined" ? undefined : navigator;
    const memory = nav && "deviceMemory" in nav ? Number((nav as Navigator & { deviceMemory?: number }).deviceMemory) : 8;
    const cores = nav?.hardwareConcurrency ?? 8;
    const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || Boolean(nav && nav.maxTouchPoints > 0));
    const isLargeScreen = width >= 768 || (typeof window !== "undefined" && Math.max(window.innerWidth, window.innerHeight) >= 1024);

    this.isTablet = isTouch && isLargeScreen;
    this.isPhone = isTouch && !isLargeScreen;
    this.isMobileOrTablet = isTouch || width < 768;

    // Quality baseline: constrained devices start in low; touch/mobile start in balanced; desktops in high
    this.quality =
      cores <= 2 || memory <= 2
        ? "low"
        : this.isMobileOrTablet
          ? "balanced"
          : "high";
  }

  public current(): RenderProfile {
    const maxDpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const deviceCategory: DeviceCategory = this.isTablet
      ? "tablet"
      : this.isPhone
        ? "phone"
        : "desktop";

    // Low profile: 1.0 DPR, shadows off for maximum fillrate headroom
    if (this.quality === "low") {
      return { quality: "low", pixelRatio: 1.0, shadows: false, deviceCategory };
    }

    // Balanced profile:
    // Tablets (e.g. Samsung Tab S8+ / iPad) have massive native displays (2800x1752).
    // Clamping DPR to 1.25x preserves razor-sharp details on AMOLED displays while saving
    // >35% in fragment shading overhead. Phones with small viewports use 1.5x.
    if (this.quality === "balanced") {
      const dprCap = this.isTablet ? 1.25 : 1.5;
      return {
        quality: "balanced",
        pixelRatio: Math.min(maxDpr, dprCap),
        shadows: true,
        deviceCategory,
      };
    }

    // High profile: Desktop full-fidelity capped at 1.75 DPR for optimal fillrate
    return {
      quality: "high",
      pixelRatio: Math.min(maxDpr, 1.75),
      shadows: true,
      deviceCategory,
    };
  }

  public update(averageFrameMs: number, nowMs: number): RenderProfile | null {
    // Hold quality state for at least 6 seconds to prevent hysteresis oscillation
    if (nowMs - this.lastChangeMs < 6000) return null;

    let next = this.quality;

    // Responsive thresholds: on tablets/mobile, downgrade if dropping below ~32 FPS
    const lagThreshold = this.isMobileOrTablet ? 32 : 42;
    if (averageFrameMs > lagThreshold) {
      next = "low";
    } else if (averageFrameMs > 25 && this.quality === "high") {
      next = "balanced";
    }
    // Only upgrade if sustained 60 FPS headroom is proven
    else if (this.quality === "low" && averageFrameMs < 17) {
      next = "balanced";
    } else if (
      this.quality === "balanced" &&
      averageFrameMs < 12 &&
      !this.isMobileOrTablet
    ) {
      next = "high";
    }

    if (next === this.quality) return null;

    this.quality = next;
    this.lastChangeMs = nowMs;
    return this.current();
  }
}
