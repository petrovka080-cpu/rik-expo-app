import { execFileSync } from "node:child_process";

jest.setTimeout(180_000);

describe("production grade backend estimate layers", () => {
  it("proves family packs, calculators, norm packs, recipes, compiled BOQ, PDF and buyer mapping", () => {
    const output = execFileSync(process.execPath, [
      "--max-old-space-size=6144",
      "node_modules/tsx/dist/cli.mjs",
      "-e",
      [
        "import { runProfessionalBoqTruthAudit10000 } from './scripts/estimate/auditProfessionalBoqTruth10000';",
        "const { summary, ledger } = runProfessionalBoqTruthAudit10000();",
        "const readyLedger = ledger.filter((row) => row.status === 'READY_PROFESSIONAL_BOQ');",
        "const blockedLedger = ledger.filter((row) => row.status !== 'READY_PROFESSIONAL_BOQ');",
        "console.log(JSON.stringify({",
        "ledger_count: ledger.length,",
        "ready_ledger_count: readyLedger.length,",
        "blocked_ledger_count: blockedLedger.length,",
        "blocked_empty_count: blockedLedger.filter((row) => row.row_count === 0).length,",
        "rows_positive: readyLedger.every((row) => row.row_count > 0),",
        "work_positive: readyLedger.every((row) => row.work_rows_count > 0),",
        "material_positive: readyLedger.every((row) => row.material_rows_count > 0),",
        "service_or_equipment_positive: readyLedger.every((row) => row.service_rows_count > 0 || row.equipment_rows_count > 0),",
        "summary",
        "}));",
      ].join(" "),
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 180_000,
    });
    const result = JSON.parse(output);
    const summary = result.summary;

    expect(result.ledger_count).toBe(11610);
    expect(result.ready_ledger_count).toBe(1595);
    expect(result.blocked_ledger_count).toBe(10015);
    expect(result.blocked_empty_count).toBe(15);
    expect(summary.ready_professional_boq_count).toBe(1595);
    expect(summary.blocked_templates_count).toBe(10015);
    expect(summary.all_ready_templates_have_calculator).toBe(true);
    expect(summary.all_ready_templates_have_parameter_schema).toBe(true);
    expect(summary.all_ready_templates_have_norm_pack).toBe(true);
    expect(summary.all_ready_templates_have_norm_source).toBe(true);
    expect(summary.all_ready_templates_have_calculation_trace).toBe(true);
    expect(summary.pdf_rows_equal_snapshot_rows).toBe(true);
    expect(summary.buyer_handoff_procurement_subset_valid).toBe(true);
    expect(result.rows_positive).toBe(true);
    expect(result.work_positive).toBe(true);
    expect(result.material_positive).toBe(true);
    expect(result.service_or_equipment_positive).toBe(true);
    expect(summary.top_blocking_reasons).toEqual([
      "NO_NORM_SOURCE:10015",
      "BUYER_HANDOFF_MAPPING_INVALID:15",
      "EMPTY_ESTIMATE:15",
      "MISSING_MATERIAL_ROWS:15",
      "MISSING_NORM_PACK:15",
      "MISSING_SERVICE_OR_EQUIPMENT_ROWS:15",
      "NO_CALCULATION_TRACE:15",
      "PDF_MAPPING_INVALID:15",
      "SHORT_PROFESSIONAL_BOQ:0/1:15",
    ]);
    expect(summary.full_10000_professional_boq_green_claimed).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);
  });
});
