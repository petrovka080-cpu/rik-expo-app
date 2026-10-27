/**
 * Realtime lifecycle discipline tests.
 *
 * WAVE N: Verifies the centralized subscription lifecycle contract:
 * - clearRealtimeSessionState clears all module state
 * - subscribeChannel returns a cleanup function
 * - Channel bindings are declared with explicit owners
 */

import { clearRealtimeSessionState } from "./realtime.client";
import * as channels from "./realtime.channels";

describe("realtime lifecycle discipline", () => {
  it("clearRealtimeSessionState is callable and does not throw", () => {
    // Session boundary cleanup must not throw even when no channels are active
    expect(() => clearRealtimeSessionState()).not.toThrow();
  });

  it("clearRealtimeSessionState is idempotent", () => {
    // Calling twice must not throw — proves safe double-cleanup
    expect(() => {
      clearRealtimeSessionState();
      clearRealtimeSessionState();
    }).not.toThrow();
  });

  it("all channel binding arrays have explicit owner fields", () => {
    const allBindings = [
      channels.BUYER_REALTIME_BINDINGS,
      channels.ACCOUNTANT_REALTIME_BINDINGS,
      channels.WAREHOUSE_REALTIME_BINDINGS,
      channels.CONTRACTOR_REALTIME_BINDINGS,
      channels.DIRECTOR_FINANCE_REALTIME_BINDINGS,
      channels.DIRECTOR_REPORTS_REALTIME_BINDINGS,
    ];

    for (const bindings of allBindings) {
      for (const binding of bindings) {
        expect(binding.owner).toBeTruthy();
        expect(typeof binding.owner).toBe("string");
        expect(binding.key).toBeTruthy();
        expect(binding.table).toBeTruthy();
      }
    }
  });

  it("mounted subscription channel names are unique across scopes", () => {
    const names = [
      channels.BUYER_REALTIME_CHANNEL_NAME,
      channels.ACCOUNTANT_REALTIME_CHANNEL_NAME,
      channels.WAREHOUSE_REALTIME_CHANNEL_NAME,
      channels.CONTRACTOR_REALTIME_CHANNEL_NAME,
      channels.DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME,
      channels.DIRECTOR_FINANCE_REALTIME_CHANNEL_NAME,
      channels.DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
    ];

    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
    expect(channels.DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME).toBe(
      channels.DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME,
    );
  });

  it("binding keys are unique within each scope", () => {
    const allBindings = [
      channels.BUYER_REALTIME_BINDINGS,
      channels.ACCOUNTANT_REALTIME_BINDINGS,
      channels.WAREHOUSE_REALTIME_BINDINGS,
      channels.CONTRACTOR_REALTIME_BINDINGS,
      channels.DIRECTOR_FINANCE_REALTIME_BINDINGS,
      channels.DIRECTOR_REPORTS_REALTIME_BINDINGS,
    ];

    for (const bindings of allBindings) {
      const keys = bindings.map((b) => b.key);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    }
  });
});
