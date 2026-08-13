import { PREDECESSOR_HEAD, readJson } from "./batch00R3TestSupport";

test("binds the unique exact Readmission GREEN predecessor", () => {
  const value = readJson("00-activation/BATCH00_R3_PREDECESSOR_EXACT_BINDING.json");
  expect(value.head).toBe(PREDECESSOR_HEAD);
  expect(value.tree).toBe("7608cef31e932198e13fefd7bf53da90f48d174a");
  expect([value.evidenceArtifactsVerified, value.evidenceArtifactMismatches, value.verdict]).toEqual([114, 0, "GREEN_EXACT_READMISSION_R2"]);
});
