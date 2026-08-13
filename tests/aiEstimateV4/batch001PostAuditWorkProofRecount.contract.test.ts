import { postAuditRows } from "./batch001PostAuditR2TestSupport";
test("каждая строка содержит нормативный и профессиональный proof bundle", () => {
  for (const { row } of postAuditRows()) { expect(row.sourceParameters?.workNormativeProofBundleV3).toBeTruthy(); expect(row.sourceParameters?.workProfessionalProofBundleV3).toBeTruthy(); }
});
