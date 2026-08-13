import { readJsonl } from "./batch00R3TestSupport";

test("records every visited or capacity-bounded candidate state", () => {
  const rows = readJsonl("02-selection/CANDIDATE_RESOLUTION_LEDGER.jsonl");
  expect(rows.map((row) => row.state)).toEqual(["SELECTED_AFTER_HARD_DEPENDENCY", "PROMOTED_HARD_DEPENDENCY_SELECTED", "SELECTED", "NOT_EVALUATED_AFTER_CAPACITY"]);
  expect(rows.every((row) => row.reasonCode && row.evidenceHash)).toBe(true);
});
