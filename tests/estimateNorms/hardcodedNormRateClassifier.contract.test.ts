import {
  classifyHardcodedMatch,
  scanHardcodedNormRates,
} from "../../scripts/estimate/auditEstimateNormSourceQuality";

describe("hardcoded norm-rate audit classifier", () => {
  it("keeps field identifiers without numeric values out of the real-rate blocker", () => {
    expect(classifyHardcodedMatch(
      "src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
      '["primer_product_reference", "primer_kg_per_m2", "primer_layer_count"]',
    )).toBe("backend_norm_record");
  });

  it("still blocks numeric production allowances and conversion rates", () => {
    expect(classifyHardcodedMatch(
      "src/lib/ai/globalEstimate/professionalWbsMeasurementPolicy.ts",
      'quantityFormula: "linear_m * 18 kg_per_linear_m_structural_steel_allowance"',
    )).toBe("real_hardcoded_production_rate");
  });

  it("separates exact dimensional conversion from a construction norm", () => {
    expect(classifyHardcodedMatch(
      "src/lib/ai/globalEstimate/professionalWbsMeasurementPolicy.ts",
      "formulaTrace: `unit=ton; kg_per_ton=1000`",
    )).toBe("dimension_unit_conversion");
  });

  it("separates parameter validation bounds from production norm values", () => {
    expect(classifyHardcodedMatch(
      "src/lib/estimate/v4/domains/heatingVentilationComplete/domainPackage.ts",
      'parameter("loading_productivity_kg_per_man_hour", "Производительность", "number", "P1", "kg_per_man_hour", ["loading_labor"], { minimum: 0.000001, maximum: 100_000_000 })',
    )).toBe("parameter_schema_constraint");
    expect(classifyHardcodedMatch(
      "src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage.ts",
      'primer_consumption_kg_per_measure: { unitId: "kg_per_measure", minimum: 0.000001 }',
    )).toBe("parameter_schema_constraint");
  });

  it("recognizes reviewed physical source-pack values as managed backend records", () => {
    expect(classifyHardcodedMatch(
      "data/estimate-norms/professional/equipment_rent.json",
      '"one_shift_hours_per_day": 8,',
    )).toBe("backend_norm_record");
  });

  it("keeps rate limits and generated template records in their own classes", () => {
    expect(classifyHardcodedMatch(
      "src/lib/api/client.ts",
      "const rateLimit = 10",
    )).toBe("unrelated_rate_limit_or_persistence");
    expect(classifyHardcodedMatch(
      "src/lib/ai/estimateTemplate10000/productionNormKnowledgeBaseCore.ts",
      "return 0.15",
    )).toBe("generated_family_default_rate");
  });

  it("finds no numeric unowned production norm rates outside managed backends", () => {
    const audit = scanHardcodedNormRates();
    expect(audit.sample_matches.filter((item) =>
      item.classification === "real_hardcoded_production_rate"
    )).toEqual([]);
    expect(audit.real_hardcoded_production_rate_count).toBe(0);
  });
});
