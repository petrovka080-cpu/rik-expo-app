import fs from "node:fs";
import path from "node:path";

import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "../../scripts/e2e/selectedWorkEnterprise1000Cases";
import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE");

function readJson<T = Record<string, any>>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, name), "utf8")) as T;
}

describe("selected work enterprise visible 1000 acceptance contracts", () => {
  it("ships exactly 1000 estimate-only selected-work cases", () => {
    expect(SELECTED_WORK_ENTERPRISE_1000_CASES).toHaveLength(1000);
    expect(new Set(SELECTED_WORK_ENTERPRISE_1000_CASES.map((item) => item.kind))).toEqual(new Set(["estimate"]));
  });

  it("keeps the dataset out of product-search and pdf-action accounting", () => {
    const matrix = readJson("dataset_matrix.json");
    expect(matrix.estimate_cases_total).toBe(1000);
    expect(matrix.product_search_cases_total).toBe(0);
    expect(matrix.pdf_action_cases_total).toBe(0);
  });

  it("covers at least 50 selected-work domains", () => {
    const matrix = readJson("dataset_matrix.json");
    expect(matrix.unique_work_domains_total).toBeGreaterThanOrEqual(50);
  });

  it("preserves required scenario quotas", () => {
    const matrix = readJson("matrix.json");
    expect(matrix.typo_noisy_cases_total).toBe(100);
    expect(matrix.broad_suggestion_cases_total).toBe(100);
    expect(matrix.quantity_edge_cases_total).toBe(100);
    expect(matrix.pdf_focused_cases_total).toBe(100);
    expect(matrix.catalog_label_cases_total).toBe(100);
    expect(matrix.control_row_policy_cases_total).toBe(50);
    expect(matrix.no_english_fallback_cases_total).toBe(50);
  });

  it("requires previous smart-search selected-work green", () => {
    const previous = readJson("previous_green_validation.json");
    expect(previous.previous_smart_search_selected_work_green).toBe(true);
  });

  it("keeps selected work as the source of truth for all cases", () => {
    const matrix = readJson("selected_work_matrix.json");
    expect(matrix.selected_work_key_source_of_truth_count).toBe(1000);
    expect(matrix.failures).toEqual([]);
  });

  it("parses quantity edge cases with explicit selected-work units", () => {
    const matrix = readJson("quantity_matrix.json");
    expect(matrix.quantity_edge_cases_total).toBe(100);
    expect(matrix.failures).toEqual([]);
  });

  it("builds exact BOQ materials for every selected work case", () => {
    const matrix = readJson("boq_exact_materials_matrix.json");
    expect(matrix.rows_with_materials).toBe(1000);
    expect(matrix.failures).toEqual([]);
  });

  it("does not expose generic visible labels or mojibake", () => {
    const scan = readJson("visible_label_scan.json");
    expect(scan.visible_label_violations).toBe(0);
    expect(scan.generic_rows_visible).toBe(0);
    expect(scan.mojibake_visible).toBe(0);
  });

  it("keeps control rows out of paid line items", () => {
    const scan = readJson("control_rows_scan.json");
    expect(scan.control_row_policy_cases_total).toBe(50);
    expect(scan.control_rows_as_paid_items).toBe(0);
  });

  it("does not use English fallback labels", () => {
    const scan = readJson("english_fallback_scan.json");
    expect(scan.no_english_fallback_cases_total).toBe(50);
    expect(scan.english_fallback_rows).toBe(0);
  });

  it("keeps catalog labels visible and free of internal keys", () => {
    const matrix = readJson("catalog_label_matrix.json");
    expect(matrix.catalog_label_cases_total).toBe(100);
    expect(matrix.catalog_rows_total).toBeGreaterThan(0);
    expect(matrix.catalog_internal_keys_visible).toBe(0);
  });

  it("matches UI rows to PDF-ready rows", () => {
    const matrix = readJson("ui_pdf_parity_matrix.json");
    expect(matrix.all_ui_payload_rows_match).toBe(true);
    expect(matrix.all_ui_pdf_rows_match).toBe(true);
    expect(matrix.failures).toEqual([]);
  });

  it("matches request, history, and foreman payloads", () => {
    const matrix = readJson("request_history_foreman_parity_matrix.json");
    expect(matrix.request_rows_match_count).toBe(1000);
    expect(matrix.foreman_rows_match_count).toBe(1000);
    expect(matrix.history_rows_preserved_count).toBe(1000);
    expect(matrix.failures).toEqual([]);
  });

  it("proves PDF-ready 1000 payloads and 250 actual PDFs", () => {
    const pdfReady = readJson("pdf_ready_1000_matrix.json");
    const actualPdf = readJson("actual_pdf_250_matrix.json");
    expect(pdfReady.final_status).toBe("GREEN_SELECTED_WORK_ENTERPRISE_1000_PDF_READY_PAYLOADS_READY");
    expect(pdfReady.pdf_ready_payloads_passed).toBe(1000);
    expect(actualPdf.final_status).toBe("GREEN_SELECTED_WORK_ENTERPRISE_1000_ACTUAL_PDF_250_READY");
    expect(actualPdf.actual_pdf_samples_passed).toBe(250);
  });

  it("registers the selected-work enterprise closeout in release guard", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "selected-work-enterprise-visible-1000-real-input-estimate-acceptance-proof",
      command: "npx tsx scripts/e2e/runSelectedWorkEnterpriseVisible1000RealInputAcceptance.ts --release-gate-self-check",
    });
  });
});
