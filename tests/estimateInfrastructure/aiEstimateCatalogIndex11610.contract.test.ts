import {
  auditAiEstimateCatalogIndex11610,
  GREEN_AI_ESTIMATE_CATALOG_INDEX_11610,
} from "../../scripts/estimate/auditAiEstimateCatalogIndex11610";

describe("AI estimate catalog index 11610", () => {
  it("builds a deterministic runtime-ready catalog index", () => {
    const { summary } = auditAiEstimateCatalogIndex11610({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_INDEX_11610);
    expect(summary.catalog_total_templates).toBe(11610);
    expect(summary.catalog_index_coverage).toBe("11610/11610");
    expect(summary.catalog_index_build_deterministic).toBe(true);
    expect(summary.catalog_search_does_not_scan_full_catalog_in_ui_path).toBe(true);
  }, 300_000);
});
