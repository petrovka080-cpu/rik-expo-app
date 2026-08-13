import { readJson } from "./batch00R3TestSupport";

test("proves bounded BATCH001 and focused-test execution", () => {
  const value = readJson("02-selection/BATCH00_R3_EXECUTION_BUDGET_POLICY_V1.json");
  expect(value.selectedGroups).toBeLessThanOrEqual(value.groupLimit);
  expect(value.selectedRecords).toBeLessThanOrEqual(value.selectedRecordLimit);
  expect(value.estimatedBatch001Minutes).toBeLessThanOrEqual(value.estimatedBatch001MinutesLimit);
  expect(value.verdict).toBe("PASS_BOUNDED_EXECUTION");
});
