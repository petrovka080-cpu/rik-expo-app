import { trimMapSize, trimSetSize } from "./boundedCacheUtils";

describe("trimMapSize", () => {
  it("does nothing when size is within limit", () => {
    const map = new Map([["a", 1], ["b", 2]]);
    trimMapSize(map, 5);
    expect(map.size).toBe(2);
  });

  it("evicts oldest entries (FIFO) when over limit", () => {
    const map = new Map([["a", 1], ["b", 2], ["c", 3], ["d", 4], ["e", 5]]);
    trimMapSize(map, 3);
    expect(map.size).toBe(3);
    // "a" and "b" should be evicted (oldest)
    expect(map.has("a")).toBe(false);
    expect(map.has("b")).toBe(false);
    expect(map.has("c")).toBe(true);
    expect(map.has("d")).toBe(true);
    expect(map.has("e")).toBe(true);
  });

  it("handles empty map", () => {
    const map = new Map();
    trimMapSize(map, 5);
    expect(map.size).toBe(0);
  });

  it("handles max of zero", () => {
    const map = new Map([["a", 1]]);
    trimMapSize(map, 0);
    expect(map.size).toBe(0);
  });
});

describe("trimSetSize", () => {
  it("does nothing when size is within limit", () => {
    const set = new Set(["a", "b"]);
    trimSetSize(set, 5);
    expect(set.size).toBe(2);
  });

  it("evicts oldest entries (FIFO) when over limit", () => {
    const set = new Set(["a", "b", "c", "d", "e"]);
    trimSetSize(set, 3);
    expect(set.size).toBe(3);
    expect(set.has("a")).toBe(false);
    expect(set.has("b")).toBe(false);
    expect(set.has("c")).toBe(true);
  });

  it("handles empty set", () => {
    const set = new Set();
    trimSetSize(set, 5);
    expect(set.size).toBe(0);
  });
});
