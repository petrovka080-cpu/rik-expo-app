import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("writes duplicate and do-not-merge reports without deduplicating catalog_items", () => {
  const duplicate = readAuditJson<Record<string, unknown>>("catalog_duplicate_report.json");
  const doNotMerge = readAuditJson<Record<string, unknown>>("catalog_do_not_merge_report.json");
  expect(duplicate.catalog_duplicate_report_written).toBe(true);
  expect(duplicate.catalog_items_deduplicated).toBe(false);
  expect(duplicate.duplicate_live_query_not_run).toBe(true);
  expect(doNotMerge.catalog_do_not_merge_report_written).toBe(true);
});
