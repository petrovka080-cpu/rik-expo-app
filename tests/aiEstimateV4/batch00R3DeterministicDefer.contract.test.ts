import { readJsonl } from "./batch00R3TestSupport";

test("does not manufacture a defer when capacity ends traversal", () => {
  expect(readJsonl("02-selection/BATCH00_R3_DEFERRED_CANDIDATE_LEDGER.jsonl")).toHaveLength(0);
  const ledger = readJsonl("02-selection/CANDIDATE_RESOLUTION_LEDGER.jsonl");
  expect(ledger.at(-1)?.reasonCode).toBe("THREE_GROUP_EXECUTABLE_CHAIN_ALREADY_COMPLETE");
});
