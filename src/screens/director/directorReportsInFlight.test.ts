import {
  clearDirectorReportsInFlight,
  resolveDirectorReportsInFlight,
  type DirectorReportsInFlightEntry,
} from "./directorReportsInFlight";

describe("directorReportsInFlight", () => {
  it("joins an in-flight request only when it belongs to the active request sequence", async () => {
    const promise = Promise.resolve();
    const entries = new Map<string, DirectorReportsInFlightEntry>([
      ["scope-a", { reqId: 7, promise }],
    ]);

    expect(resolveDirectorReportsInFlight(entries, "scope-a", 7)).toEqual({
      action: "join",
      reqId: 7,
      promise,
    });
    expect(entries.has("scope-a")).toBe(true);
  });

  it("drops stale in-flight entries instead of joining an obsolete request", () => {
    const entries = new Map<string, DirectorReportsInFlightEntry>([
      ["scope-a", { reqId: 7, promise: Promise.resolve() }],
    ]);

    expect(resolveDirectorReportsInFlight(entries, "scope-a", 8)).toEqual({
      action: "drop_stale",
      staleReqId: 7,
      currentReqId: 8,
    });
    expect(entries.has("scope-a")).toBe(false);
  });

  it("does not let an old task clear a newer in-flight entry with the same key", () => {
    const entries = new Map<string, DirectorReportsInFlightEntry>([
      ["scope-a", { reqId: 8, promise: Promise.resolve() }],
    ]);

    expect(clearDirectorReportsInFlight(entries, "scope-a", 7)).toBe(false);
    expect(entries.get("scope-a")?.reqId).toBe(8);

    expect(clearDirectorReportsInFlight(entries, "scope-a", 8)).toBe(true);
    expect(entries.has("scope-a")).toBe(false);
  });
});
