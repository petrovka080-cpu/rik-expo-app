import { readJson } from "./postM1R2TestSupport";

test("keeps BATCH-00 unexecuted with zero selected groups and content mutation", () => {
  const validation = readJson<any>("09-batch00-r3/BATCH00_R3_CONTRACT_VALIDATION.json");
  expect(validation).toMatchObject({ placeholderCount: 0, selectedGroups: 0, exactBatchManifestCount: 0, contentMutation: 0 });
  expect(validation.verdict).toBe("GREEN_BATCH00_R3_CONTRACT_VALID");
});
