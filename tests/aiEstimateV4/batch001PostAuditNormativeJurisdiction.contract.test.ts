import { postAuditRows, rowMetadata } from "./batch001PostAuditR2TestSupport";
test("иностранные документы не повышены до обязательных КР", () => {
  for (const { row } of postAuditRows()) for (const trace of rowMetadata(row).normativeRowTraceV3 as Array<Record<string, unknown>>) expect(trace.foreign_mandatory_for_kg).toBe(false);
});
