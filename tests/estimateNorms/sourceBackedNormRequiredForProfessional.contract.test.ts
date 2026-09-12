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

  it("keeps cross-unit generated rows non-professional without an applicability-bound physical source", () => {
    const workKey =
      "concrete_foundation_interior_strip_foundation_pour_standard";
    const definition = getProductionWorkDefinition10000(workKey);
    if (!definition) throw new Error(`TEST_WORK_DEFINITION_MISSING:${workKey}`);
    const normItems = getProductionExpandedTemplate10000(workKey).rows
      .map((row) => buildEstimateNormItemForTemplateRow(definition, row));
    const generic = normItems.find((item) =>
      item.source_id.includes("src_professional_norm_pack_catalog_") &&
      item.unit !== item.base_unit
    );
    if (!generic) {
      throw new Error("DIMENSIONAL_NORM_FIXTURES_MISSING");
    }

    expect(normItems.some((item) => isRegisteredProfessionalNormPackSourceId(item.source_id))).toBe(false);
    expect(generic.dimensional_contract).toMatchObject({
      workBasisUnit: "m3",
      resourceOutputUnit: "kg",
      consumptionRate: generic.consumption_rate,
      consumptionRateUnit: "kg/m3",
      conversionFactor: generic.unit_conversion_factor,
      calculatedQuantity: null,
      roundingPolicy: generic.rounding_policy,
      sourceClaim: {
        sourceId: generic.source_id,
        normativeStatus: "GENERIC_REFERENCE_NOT_PROFESSIONAL",
        url: null,
      },
    });
    expect(isProfessionalNormPackSourceId(generic.source_id)).toBe(false);
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

  it("uses measured route length for line-laying scopes without selecting a product-specific norm", () => {
    const cases = [
      {
        category: "electrical",
        elementKey: "low_voltage",
        operationKey: "lay",
        expectedCount: 6,
        standardWorkKey: "electrical_interior_low_voltage_lay_standard",
        primaryRowCode: "electrical_interior_low_voltage_lay_standard_materials_01",
      },
      {
        category: "plumbing",
        elementKey: "sewer",
        operationKey: "route",
        expectedCount: 5,
        standardWorkKey: "plumbing_interior_sewer_route_standard",
        primaryRowCode: "plumbing_interior_sewer_route_standard_materials_01",
      },
      {
        category: "ventilation",
        elementKey: "duct",
        operationKey: "install",
        expectedCount: 4,
        standardWorkKey: "ventilation_interior_duct_install_standard",
        primaryRowCode: "ventilation_interior_duct_install_standard_materials_01",
      },
    ] as const;

    for (const testCase of cases) {
      const definitions = PRODUCTION_WORK_DEFINITIONS_10000.filter((definition) =>
        definition.category === testCase.category &&
        definition.elementKey === testCase.elementKey &&
        definition.operationKey === testCase.operationKey
      );
      expect(definitions).toHaveLength(testCase.expectedCount);
      expect(definitions.every((definition) => definition.defaultUnit === "linear_m")).toBe(true);

      const definition = getProductionWorkDefinition10000(testCase.standardWorkKey);
      if (!definition) throw new Error(`LINEAR_SCOPE_DEFINITION_MISSING:${testCase.standardWorkKey}`);
      const primaryRow = getProductionExpandedTemplate10000(definition.workKey).rows.find((row) =>
        row.rowCode === testCase.primaryRowCode
      );
      if (!primaryRow) throw new Error(`LINEAR_SCOPE_PRIMARY_ROW_MISSING:${testCase.primaryRowCode}`);
      const norm = buildEstimateNormItemForTemplateRow(definition, primaryRow);

      expect(norm).toMatchObject({
        base_unit: "linear_m",
        unit: "linear_m",
        dimensional_contract: {
          workBasisUnit: "linear_m",
          resourceOutputUnit: "linear_m",
          consumptionRateUnit: "linear_m/linear_m",
        },
      });
      expect(isRegisteredProfessionalNormPackSourceId(norm.source_id)).toBe(false);
      expect(norm.dimensional_contract.sourceClaim.normativeStatus).toBe(
        "GENERIC_REFERENCE_NOT_PROFESSIONAL",
      );
    }
  });
});
