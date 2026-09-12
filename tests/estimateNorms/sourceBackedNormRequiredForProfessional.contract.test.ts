import { classifyEstimateRowReality } from "../../scripts/estimate/classifyEstimateRowReality";
import {
  getProductionExpandedTemplate10000,
  getProductionWorkDefinition10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
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

  it("uses heated floor area as the installation basis without pretending the source pack is selected", () => {
    const warmFloorInstallations = PRODUCTION_WORK_DEFINITIONS_10000.filter((definition) =>
      definition.category === "heating_hvac" &&
      definition.elementKey === "warm_floor" &&
      definition.operationKey === "install"
    );
    expect(warmFloorInstallations).toHaveLength(5);
    expect(warmFloorInstallations.every((definition) => definition.defaultUnit === "m2")).toBe(true);

    const definition = getProductionWorkDefinition10000(
      "heating_hvac_interior_warm_floor_install_standard",
    );
    if (!definition) throw new Error("WARM_FLOOR_INSTALL_DEFINITION_MISSING");
    const pipeRow = getProductionExpandedTemplate10000(definition.workKey).rows.find((row) =>
      row.rowCode === "heating_hvac_interior_warm_floor_install_standard_materials_02"
    );
    if (!pipeRow) throw new Error("WARM_FLOOR_PIPE_ROW_MISSING");
    const pipeNorm = buildEstimateNormItemForTemplateRow(definition, pipeRow);

    expect(pipeNorm).toMatchObject({
      base_unit: "m2",
      unit: "linear_m",
      dimensional_contract: {
        workBasisUnit: "m2",
        resourceOutputUnit: "linear_m",
        consumptionRateUnit: "linear_m/m2",
      },
    });
    expect(pipeNorm.formula_inputs).toHaveLength(2);
    expect(pipeNorm.formula_inputs).toEqual(expect.arrayContaining(["q", "normFactor"]));
    expect(isRegisteredProfessionalNormPackSourceId(pipeNorm.source_id)).toBe(false);
    expect(pipeNorm.dimensional_contract.sourceClaim.normativeStatus).toBe(
      "GENERIC_REFERENCE_NOT_PROFESSIONAL",
    );
  });
});
