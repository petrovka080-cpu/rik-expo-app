import { runRequestEstimateCatalogBoqNoHacksAudit } from "../../scripts/audit/runRequestEstimateCatalogBoqNoHacksAudit";

describe("request estimate release gate rejects hacks", () => {
  it("keeps the no-hacks audit green for request estimate release", () => {
    const audit = runRequestEstimateCatalogBoqNoHacksAudit();
    expect(audit.no_hacks_audit_passed).toBe(true);
    expect(audit.use_effect_rewrite_found).toBe(false);
    expect(audit.screen_local_calculation_found).toBe(false);
    expect(audit.inline_rows_in_screens_found).toBe(false);
    expect(audit.hardcoded_foundation_patch_found).toBe(false);
    expect(audit.fake_catalog_items_found).toBe(false);
    expect(audit.fake_stock_found).toBe(false);
    expect(audit.fake_supplier_found).toBe(false);
    expect(audit.fake_availability_found).toBe(false);
    expect(audit.duplicate_catalog_service_found).toBe(false);
    expect(audit.second_ai_framework_created).toBe(false);
    expect(audit.pdf_renderer_replaced_globally).toBe(false);
    expect(audit.fifty_k_expansion_enabled).toBe(false);
  });
});
