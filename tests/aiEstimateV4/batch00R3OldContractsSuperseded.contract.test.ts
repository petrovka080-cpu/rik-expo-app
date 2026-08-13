import { readJson } from "./batch00R3TestSupport";

test("supersedes old generated BATCH-00 contracts without weakening", () => {
  const value = readJson("00-activation/BATCH00_R1_R2_SUPERSESSION_PROOF.json");
  expect(value.strengthenedControls).toHaveLength(5);
  expect(value.weakenedControls).toEqual([]);
  expect(value.verdict).toBe("GREEN_R3_SUPERSEDES_R1_R2_WITHOUT_WEAKENING");
});
