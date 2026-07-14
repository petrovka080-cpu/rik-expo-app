import fs from "node:fs";
import path from "node:path";

import {
  PROFESSIONAL_ESTIMATE_ARTIFACT_DIR,
  runProfessionalEstimate1500WorkAudit,
} from "../../scripts/e2e/professionalEstimate1500WorkCases";
import {
  professionalCoverage,
  professionalCurrencyAudit,
  professionalFormulaAudit,
  professionalGolden,
  professionalPricebookAudit,
  professionalSnapshotAudit,
} from "./professionalEstimateTestHelpers";

const ARTIFACTS_WRITTEN_BY_AUDITS = [
  "matrix.json",
  "professional_estimate_1500_cases.json",
  "professional_estimate_1500_results.json",
  "deep_golden_300_cases.json",
  "deep_golden_300_results.json",
  "template_coverage.json",
  "group_template_coverage.json",
  "work_specific_template_coverage.json",
  "material_formula_results.json",
  "pricebook_results.json",
  "regional_currency_results.json",
  "missing_price_report.json",
  "fake_price_scan.json",
  "fake_supplier_scan.json",
  "no_generic_material_rows.json",
  "no_paid_control_rows.json",
  "snapshot_no_desync.json",
  "ui_pdf_request_history_parity.json",
] as const;

function readAuditArtifacts(): Map<string, string> {
  const result = new Map<string, string>();
  for (const fileName of ARTIFACTS_WRITTEN_BY_AUDITS) {
    const filePath = path.join(PROFESSIONAL_ESTIMATE_ARTIFACT_DIR, fileName);
    result.set(fileName, fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "__MISSING__");
  }
  return result;
}

describe("professional estimate audit helper read-only contract", () => {
  it("does not rewrite proof artifacts when contract tests call audit helpers", () => {
    const before = readAuditArtifacts();

    professionalCoverage();
    runProfessionalEstimate1500WorkAudit({ writeArtifacts: false });
    professionalGolden();
    professionalFormulaAudit();
    professionalPricebookAudit();
    professionalCurrencyAudit();
    professionalSnapshotAudit();

    expect(readAuditArtifacts()).toEqual(before);
  });
});
