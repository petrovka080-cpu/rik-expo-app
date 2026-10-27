import {
  canonicalizeForEstimateHash,
  estimateDeterministicHash,
} from "./estimateDeterministicHash";

function legacyMaterializedHash(value: unknown): string {
  const text = JSON.stringify(canonicalizeForEstimateHash(value));
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `eh_${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

describe("estimateDeterministicHash", () => {
  it("preserves the materialized canonical JSON hash contract", () => {
    const sparse = [1, undefined, 3];
    delete sparse[2];
    const cases: unknown[] = [
      null,
      undefined,
      true,
      false,
      0,
      -0,
      1.23456789,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "escaped:\"\\\nкириллица",
      "кириллица:\ud83d\ude80:\ud800:\udc00",
      { "ключ": "значение", emoji: "\ud83e\uddf1", escaped: "\b\f\r\t" },
      { z: undefined, b: [1, undefined, { x: "y" }], a: false },
      sparse,
    ];

    for (const value of cases) {
      expect(estimateDeterministicHash(value)).toBe(legacyMaterializedHash(value));
    }
  });

  it("hashes a large canonical value without building one aggregate JSON string", () => {
    const largeValue = Array.from({ length: 100_000 }, (_, index) => ({
      index,
      value: `catalog-${index % 1_000}`,
      enabled: index % 2 === 0,
    }));

    expect(estimateDeterministicHash(largeValue)).toBe(legacyMaterializedHash(largeValue));
  });
});
