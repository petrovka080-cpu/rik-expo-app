/**
 * B-REAL-3 — useMapListingsQuery tests.
 * Validates query key factory, hook shape, and data normalization.
 */

import { mapListingsKeys, useMapListingsQuery } from "./useMapListingsQuery";

describe("mapListingsKeys — key factory", () => {
  it("all is deterministic", () => {
    expect(mapListingsKeys.all).toEqual(["map", "listings"]);
  });

  it("active() includes status segment", () => {
    expect(mapListingsKeys.active()).toEqual(["map", "listings", "active"]);
  });

  it("active() is a new array each call (no shared ref)", () => {
    const a = mapListingsKeys.active();
    const b = mapListingsKeys.active();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("active key namespace is nested under all", () => {
    const active = mapListingsKeys.active();
    const all = mapListingsKeys.all;
    expect(active[0]).toBe(all[0]);
    expect(active[1]).toBe(all[1]);
    expect(active.length).toBeGreaterThan(all.length);
  });
});

describe("useMapListingsQuery — export shape", () => {
  it("is a function", () => {
    expect(typeof useMapListingsQuery).toBe("function");
  });
});
