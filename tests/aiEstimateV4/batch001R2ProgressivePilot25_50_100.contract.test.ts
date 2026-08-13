import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";

function checkpoints<T>(members: readonly T[]) {
  const take = (ratio: number) => members.slice(0, Math.ceil(members.length * ratio));
  return { pilot: members.slice(0, 1), p25: take(0.25), p50: take(0.5), p100: [...members] };
}

describe("BATCH001 R2 progressive pilot 25/50/100", () => {
  test.each([
    ["FRAME", BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3.slice(0, 5), [1, 2, 3, 5]],
    ["ALIGN", BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3.slice(5, 10), [1, 2, 3, 5]],
    ["CLAD", BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3.slice(10, 16), [1, 2, 3, 6]],
  ] as const)("uses exact cumulative slices for %s", (_group, members, expected) => {
    const result = checkpoints(members);
    expect([result.pilot.length, result.p25.length, result.p50.length, result.p100.length]).toEqual(expected);
    expect(result.p25.slice(0, result.pilot.length)).toEqual(result.pilot);
    expect(result.p50.slice(0, result.p25.length)).toEqual(result.p25);
    expect(result.p100.slice(0, result.p50.length)).toEqual(result.p50);
    expect(new Set(result.p100).size).toBe(members.length);
  });
});
