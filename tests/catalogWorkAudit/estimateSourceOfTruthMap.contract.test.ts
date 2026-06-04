import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("maps estimate and BOQ source-of-truth through GlobalEstimateResult and request payload parity", () => {
  const map = readAuditJson<Record<string, unknown>>("estimate_source_of_truth_map.json");
  expect(map.estimate_source_of_truth_map_written).toBe(true);
  expect(map.primary_runtime_result).toBe("GlobalEstimateResult");
  expect(String(map.boq_source_of_truth)).toContain("SourceBackedEstimateRow");
  expect(map.primary_files).toEqual(expect.arrayContaining(["src/features/consumerRepair/buildRequestEstimatePayload.ts"]));
});
