import { readJson } from "./batch00R3TestSupport";

test("reuses exact ProgramControlStateV3 arithmetic", () => {
  const value = readJson("00-activation/BATCH00_R3_PROGRAM_STATE_VERIFICATION.json");
  expect(value.counts).toEqual({ global: 11610, m1Global: 55, externalBenchmark: 8, m5: 4005, cumulative: 4060, m6: 7550 });
  expect(value.programControlStateV3Hash).toBe("2d937c080077eaa4978a4bcca0cc96228518b50aa7cde4330b7c3764b9898cf4");
});
