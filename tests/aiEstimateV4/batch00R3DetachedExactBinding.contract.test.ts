import { readJson, readText, sha256 } from "./postM1R2TestSupport";

test("binds detached BATCH-00 R3 without a self-referential tracked SHA", () => {
  const name = "09-batch00-r3/POST_M1_READMISSION_BATCH_00_FIRST_2_TO_3_WORK_GROUP_SELECTION_NORMATIVE_READINESS_AND_EXACT_EXECUTION_MANIFEST_R3.md";
  const contract = readText(name);
  const binding = readJson<any>("09-batch00-r3/BATCH00_R3_EXACT_PREDECESSOR_BINDING.json");
  const canonical = contract.split("\n").filter((line) => !line.startsWith("**selfCanonicalSha256:**")).join("\n");
  expect(sha256(canonical)).toBe(binding.batch00R3CanonicalSha256);
  expect(binding.readmissionTrackedHead).toMatch(/^[0-9a-f]{40}$/u);
  expect(binding.readmissionTrackedTree).toMatch(/^[0-9a-f]{40}$/u);
});
