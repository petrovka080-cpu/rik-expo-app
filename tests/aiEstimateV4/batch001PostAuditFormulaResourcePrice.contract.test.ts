import { postAuditRows, rowMetadata } from "./batch001PostAuditR2TestSupport";
test("каждая cost row имеет FormulaGraph, ResourceGraph и price route", () => {
  for (const { row } of postAuditRows()) { const m = rowMetadata(row); expect(m.formulaGraphV3).toBeTruthy(); expect(m.professionalResourceGraphV3).toBeTruthy(); expect(m.priceRouteV3).toBeTruthy(); }
});
