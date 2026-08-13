import { postAuditRows, rowMetadata } from "./batch001PostAuditR2TestSupport";
test("100% final rows имеют formula и normative traces", () => {
  for (const { row } of postAuditRows()) { const m = rowMetadata(row); expect(m.formulaGraphV3).toBeTruthy(); expect((m.normativeRowTraceV3 as unknown[])?.length).toBeGreaterThanOrEqual(2); }
});
