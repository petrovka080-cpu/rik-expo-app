import { classifyEstimateRowReality } from "../../scripts/estimate/classifyEstimateRowReality";
import {
  getProductionExpandedTemplate10000,
  getProductionWorkDefinition10000,
} from "../../src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000";
import {
  buildEstimateNormItemForTemplateRow,
  validateEstimateNormItem,
} from "../../src/lib/ai/estimateTemplate10000/productionNormKnowledgeBaseCore";
import {
  isProfessionalNormPackSourceId,
  isRegisteredProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000/productionProfessionalNormPackRegistry";

describe("source-backed norm required for professional status", () => {
  it("accepts only professional norm pack source ids as source-backed", () => {
    const row = classifyEstimateRowReality({
      rowCode: "real",
      section: "materials",
      unit: "kg",
      quantity: 10,
      normId: "norm:real",
      normVersion: "2026.07",
      normSourceId: "src_professional_norm_pack_screed_cement_sand_mix_kg_m2_50mm_v1",
      calculationTrace: "formula=q; normSource=src_professional_norm_pack_screed_cement_sand_mix_kg_m2_50mm_v1; result=10 kg",
      formulaId: "formula",
    });

    expect(row.is_source_backed).toBe(true);
    expect(row.source_status).toBe("READY_SOURCE_BACKED");
    expect(row.blocking_reasons).not.toContain("generated_family_default_not_professional");
  });

  it("separates work basis, resource output, rate units, conversion and source applicability", () => {
    const workKey =
      "concrete_foundation_interior_strip_foundation_pour_standard";
    const definition = getProductionWorkDefinition10000(workKey);
    if (!definition) throw new Error(`TEST_WORK_DEFINITION_MISSING:${workKey}`);
    const normItems = getProductionExpandedTemplate10000(workKey).rows
      .map((row) => buildEstimateNormItemForTemplateRow(definition, row));
    const professional = normItems.find((item) =>
      isRegisteredProfessionalNormPackSourceId(item.source_id) &&
      item.unit !== item.base_unit
    );
    const generic = normItems.find((item) =>
      item.source_id.includes("src_professional_norm_pack_catalog_")
    );
    if (!professional || !generic) {
      throw new Error("DIMENSIONAL_NORM_FIXTURES_MISSING");
    }

    expect(professional.dimensional_contract).toMatchObject({
      workBasisUnit: "m3",
      resourceOutputUnit: "kg",
      consumptionRate: professional.consumption_rate,
      consumptionRateUnit: "kg/m3",
      conversionFactor: professional.unit_conversion_factor,
      calculatedQuantity: null,
      roundingPolicy: professional.rounding_policy,
      sourceClaim: {
        sourceId: professional.source_id,
        jurisdiction: "INTERNATIONAL_REFERENCE",
        accessType: "PUBLIC_OPEN",
        normativeStatus: "REFERENCE_METHOD",
      },
    });
    expect(professional.dimensional_contract.sourceClaim.url).toMatch(/^https:\/\//);
    expect(validateEstimateNormItem(professional)).toEqual([]);

    expect(isProfessionalNormPackSourceId(generic.source_id)).toBe(false);
    expect(generic.dimensional_contract.sourceClaim).toMatchObject({
      normativeStatus: "GENERIC_REFERENCE_NOT_PROFESSIONAL",
      url: null,
    });
    expect(validateEstimateNormItem(generic)).toEqual([]);
  });
});
