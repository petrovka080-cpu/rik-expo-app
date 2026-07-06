import { loadEstimateSourceRegistryRecords, resolveEstimateSourceForNormSourceId } from "../../src/lib/estimate/sourceRegistry";
import { validateEstimateSourceRegistry } from "../../src/lib/estimate/validateSourceRegistry";

describe("source registry governance", () => {
  it("keeps official, internal, manufacturer, and preliminary sources governed without fake trust", () => {
    const summary = validateEstimateSourceRegistry();
    const records = loadEstimateSourceRegistryRecords();

    expect(summary.source_registry_valid).toBe(true);
    expect(summary.official_sources_count).toBeGreaterThanOrEqual(1);
    expect(summary.online_verifiable_sources_count).toBeGreaterThanOrEqual(1);
    expect(summary.raw_copyrighted_norm_books_committed_count).toBe(0);
    expect(summary.unverified_sources_used_as_trusted_count).toBe(0);
    expect(records.some((record) => record.source_quality === "preliminary_engineering_reference")).toBe(true);
    expect(records.every((record) => record.raw_copyrighted_norm_book_committed === false)).toBe(true);
  });

  it("resolves existing normSourceId families to governed registry records", () => {
    const labor = resolveEstimateSourceForNormSourceId({
      normSourceId: "src_professional_norm_pack_catalog_paint_labor_labor_m2_v1",
      normSourceTitle: "Estimator-reviewed productivity sheet mapped to paint/labor/m2",
    });
    const material = resolveEstimateSourceForNormSourceId({
      normSourceId: "src_professional_norm_pack_tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1",
      normSourceTitle: "Ceresit CM 11 PLUS technical data sheet",
    });
    const expanded = resolveEstimateSourceForNormSourceId({
      normSourceId: "src_expanded_complex_transport_reference_formula_v1",
      normSourceTitle: "Engineering formula",
    });

    expect(labor.registrySourceId).toBe("professional_internal_productivity_sheet_2026_07");
    expect(labor.record.trusted_for_production_norms).toBe(true);
    expect(material.registrySourceId).toBe("professional_manufacturer_consumption_sheet_2026_07");
    expect(material.record.trusted_for_production_norms).toBe(true);
    expect(expanded.registrySourceId).toBe("expanded_complex_engineering_reference_formula_2026_07");
    expect(expanded.record.trusted_for_production_norms).toBe(false);
    expect(expanded.record.preliminary_disclosure_required).toBe(true);
  });
});
