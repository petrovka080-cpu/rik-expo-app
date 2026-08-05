import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";
import { classifyEstimateRowReality } from "../../scripts/estimate/classifyEstimateRowReality";

describe("blind quantity copy detector", () => {
  it("does not flag source-backed formula rows as blind user quantity copies", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "profile_sheet_fence_full");
    expect(testCase).toBeDefined();

    const result = evaluateWorkSpecificityCase(testCase!);

    expect(result.blind_quantity_copy_count).toBe(0);
    expect(result.blocking_reasons).not.toContain("blind_user_quantity_copy_detected");
  });

  it("separates an unregistered norm source from an actual formula-free blind copy", () => {
    const traced = classifyEstimateRowReality({
      rowCode: "unregistered-traced",
      section: "materials",
      unit: "kg",
      quantity: 100,
      quantityFormula: "baseQuantity * normFactor",
      formulaId: "formula-v1",
      calculationTrace: "formula=baseQuantity * normFactor; result=100",
      normId: "unregistered-norm",
      normVersion: "1",
      normSourceId: "generated_family_default_test",
      sourceParameters: {
        baseQuantity: 100,
        baseUnit: "m2",
        formulaContext: { baseQuantity: 100, normFactor: 1 },
        normParameterRequirements: [
          { key: "baseQuantity", unit: "m2", required: true, source: "user_measurement" },
          { key: "normFactor", unit: "kg", required: true, source: "norm_record" },
        ],
      },
    });
    const blind = classifyEstimateRowReality({
      rowCode: "unregistered-blind",
      section: "materials",
      unit: "kg",
      quantity: 100,
      normId: "unregistered-norm",
      normVersion: "1",
      normSourceId: "generated_family_default_test",
      sourceParameters: { baseQuantity: 100 },
    });

    expect(traced.is_source_backed).toBe(false);
    expect(traced.quantity_copied_from_user_input).toBe(false);
    expect(traced.identity_formula_without_verified_coefficient).toBe(true);
    expect(traced.formula_semantic_unverified).toBe(true);
    expect(traced.professional_ready).toBe(false);
    expect(traced.blocking_reasons).toContain("row_not_source_backed_professional_norm");
    expect(blind.quantity_copied_from_user_input).toBe(true);
    expect(blind.has_formula_trace).toBe(false);
  });

  it.each([
    ["m3", "volume"],
    ["set", "count"],
    ["piece", "count"],
  ] as const)(
    "fails closed for an unverified identity conversion from 400 m2 to %s",
    (unit, expectedDimension) => {
      const result = classifyEstimateRowReality({
        rowCode: `unsafe-area-to-${unit}`,
        section: "materials",
        lineType: "material",
        unit,
        quantity: 400,
        quantityFormula: "round_to(q * normFactor, 4)",
        formulaId: "unsafe-identity-formula-v1",
        calculationTrace: "formula=round_to(q * normFactor, 4); result=400",
        normId: "unverified-norm",
        normVersion: "1",
        normSourceId: "generated_family_default_unverified",
        includedInProcurement: true,
        sourceParameters: {
          baseQuantity: 400,
          baseUnit: "m2",
          formulaContext: { q: 400, normFactor: 1 },
          normParameterRequirements: [
            { key: "q", unit: "m2", required: true, source: "user_measurement" },
            { key: "normFactor", unit, required: true, source: "norm_record" },
          ],
        },
      });

      expect(result.blind_copy_without_formula_trace).toBe(false);
      expect(result.identity_formula_without_verified_coefficient).toBe(true);
      expect(result.unit_dimension_mismatch).toBe(true);
      expect(result.row_dimension).toBe(expectedDimension);
      expect(result.formula_runtime_valid).toBe(true);
      expect(result.formula_semantic_unverified).toBe(true);
      expect(result.norm_source_unregistered).toBe(true);
      expect(result.professional_ready).toBe(false);
    },
  );

  it("fails closed for an unverified identity conversion from metres to tonnes", () => {
    const result = classifyEstimateRowReality({
      rowCode: "unsafe-length-to-mass",
      section: "materials",
      unit: "t",
      quantity: 25,
      quantityFormula: "q * normFactor",
      formulaId: "unsafe-length-mass-v1",
      calculationTrace: "formula=q * normFactor; result=25",
      normId: "unverified-norm",
      normVersion: "1",
      normSourceId: "generated_family_default_unverified",
      sourceParameters: {
        baseQuantity: 25,
        baseUnit: "m",
        formulaContext: { q: 25, normFactor: 1 },
        normParameterRequirements: [
          { key: "q", unit: "m", required: true, source: "user_measurement" },
          { key: "normFactor", unit: "t", required: true, source: "norm_record" },
        ],
      },
    });

    expect(result.base_dimension).toBe("length");
    expect(result.row_dimension).toBe("mass");
    expect(result.unit_dimension_mismatch).toBe(true);
    expect(result.professional_ready).toBe(false);
  });
});
