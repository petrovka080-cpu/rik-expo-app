import { readJson, sha256, stableJson } from "./batch00R3TestSupport";

test("seals a placeholder-free ExactBatchManifestV3", () => {
  const manifest = readJson("09-manifest/BATCH_001_EXACT_EXECUTION_MANIFEST_V3.json");
  const { manifestHash, ...withoutHash } = manifest;
  expect(sha256(stableJson(withoutHash))).toBe(manifestHash);
  expect(manifest).toMatchObject({ schemaVersion: "ExactBatchManifestV3", batchId: "BATCH_001", groupCount: 3, combinedRecordCount: 16, ownerAuthorizationStatus: "PENDING", executionStarted: false, contentMutationCount: 0 });
  expect(stableJson(manifest)).not.toMatch(/\b(?:unknown|todo|tbd|placeholder)\b/iu);
});
