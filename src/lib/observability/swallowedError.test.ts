import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "./platformObservability";
import { recordSwallowedError } from "./swallowedError";

describe("recordSwallowedError", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("records a typed soft failure without throwing", () => {
    recordSwallowedError({
      screen: "notifications",
      surface: "notify_sound",
      event: "notify_web_play_failed",
      error: new Error("gesture required"),
      sourceKind: "audio:web",
      errorStage: "play",
    });

    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        screen: "notifications",
        surface: "notify_sound",
        category: "ui",
        event: "notify_web_play_failed",
        result: "error",
        trigger: "catch",
        sourceKind: "audio:web",
        errorStage: "play",
        errorClass: "Error",
        errorMessage: "gesture required",
        extra: expect.objectContaining({
          catchKind: "soft_failure",
        }),
      }),
    ]);
  });

  it("records cleanup-only failures as reload observability", () => {
    recordSwallowedError({
      screen: "supplier_map",
      surface: "map_renderer",
      event: "map_leaflet_dispose_failed",
      error: "dispose failed",
      kind: "cleanup_only",
      sourceKind: "leaflet:web",
    });

    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        screen: "supplier_map",
        surface: "map_renderer",
        category: "reload",
        event: "map_leaflet_dispose_failed",
        result: "error",
        trigger: "catch",
        sourceKind: "leaflet:web",
        errorStage: "map_leaflet_dispose_failed",
        errorMessage: "dispose failed",
        extra: expect.objectContaining({
          catchKind: "cleanup_only",
        }),
      }),
    ]);
  });
});
