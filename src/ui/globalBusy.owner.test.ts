import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../lib/observability/platformObservability";
import { createGlobalBusyOwner } from "./globalBusy.owner";

describe("globalBusy.owner", () => {
  let currentTime = 1_000;
  let waits: number[] = [];

  const createOwner = (params?: { longHeldMs?: number }) =>
    createGlobalBusyOwner({
      now: () => currentTime,
      wait: async (ms) => {
        waits.push(ms);
        currentTime += ms;
      },
      longHeldMs: params?.longHeldMs,
    });

  beforeEach(() => {
    currentTime = 1_000;
    waits = [];
    resetPlatformObservabilityEvents();
  });

  it("acquires busy only at real work start and releases on success", async () => {
    const owner = createOwner();
    const timeline: string[] = [];
    owner.setSnapshotListener((snapshot) => {
      timeline.push(`snapshot:${snapshot.uiKey ?? "none"}`);
    });

    const result = await owner.run(async () => {
      timeline.push("fn_started");
      expect(owner.isBusy("pdf:test")).toBe(true);
      expect(waits).toEqual([]);
      currentTime += 40;
      return "ok";
    }, { key: "pdf:test", label: "Preparing PDF", minMs: 100 });

    expect(result).toBe("ok");
    expect(owner.isBusy("pdf:test")).toBe(false);
    expect(waits).toEqual([60]);
    expect(timeline).toEqual(["snapshot:pdf:test", "fn_started", "snapshot:none"]);

    const runEvent = getPlatformObservabilityEvents().find(
      (event) => event.event === "busy_run" && event.result === "success",
    );
    expect(runEvent?.extra).toMatchObject({
      key: "pdf:test",
      minMsApplied: true,
      waitMs: 60,
    });
  });

  it("releases busy on error path without extra pre-release wait", async () => {
    const owner = createOwner();

    await expect(
      owner.run(async () => {
        expect(owner.isBusy("pdf:error")).toBe(true);
        expect(waits).toEqual([]);
        currentTime += 25;
        throw new Error("prepare failed");
      }, { key: "pdf:error", label: "Preparing PDF", minMs: 300 }),
    ).rejects.toThrow("prepare failed");

    expect(owner.isBusy("pdf:error")).toBe(false);
    expect(waits).toEqual([]);

    const events = getPlatformObservabilityEvents();
    expect(
      events.some(
        (event) =>
          event.event === "busy_run"
          && event.result === "error"
          && event.errorStage === "operation",
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.event === "busy_release"
          && event.result === "error"
          && event.extra?.reason === "error",
      ),
    ).toBe(true);
  });

  it("records mismatch, duplicate-owner skip, and long-held busy", async () => {
    const owner = createOwner({ longHeldMs: 1_000 });

    owner.show("manual:key", "Manual");
    currentTime += 1_250;
    owner.hide("manual:key");
    owner.hide("missing:key");
    owner.show("duplicate:key", "Manual duplicate");

    const skipped = await owner.run(async () => "never", {
      key: "duplicate:key",
      label: "Should skip",
    });

    expect(skipped).toBeNull();

    const events = getPlatformObservabilityEvents();
    expect(
      events.some(
        (event) =>
          event.event === "busy_long_held"
          && event.result === "success"
          && event.durationMs === 1250,
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.event === "busy_mismatch"
          && event.result === "error"
          && event.errorStage === "release_unknown_owner",
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.event === "busy_run"
          && event.result === "skipped"
          && event.extra?.guardReason === "owner_already_active",
      ),
    ).toBe(true);
  });

  it("records leaked owners on dispose", () => {
    const owner = createOwner();

    owner.show("leak:key", "Leaked");
    owner.dispose();

    expect(owner.isBusy()).toBe(false);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "busy_dispose"
          && event.result === "error"
          && event.errorStage === "dispose_with_active_owners",
      ),
    ).toBe(true);
  });
});
