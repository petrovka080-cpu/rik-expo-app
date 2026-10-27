import {
  canonicalApprovedBaselineParameterIsRuntimeEligible,
  canonicalApprovedBaselineRuntimeDefaultValue,
  canonicalApprovedBaselineRuntimeParameters,
} from "./canonicalEstimateApprovedBaseline";

describe("canonical approved baseline runtime policy", () => {
  test("does not turn validation fixture values into new project inputs", () => {
    const baseline = {
      input_values: {
        work_included: true,
        area_m2: 100,
        delivery_mass_kg: 1250,
        access_equipment_shift_count: 4,
      },
      input_classification: {
        work_included: "RUNTIME_STRUCTURAL_DEFAULT",
        area_m2: "FIXTURE_ONLY",
        delivery_mass_kg: "VALIDATION_FIXTURE",
        access_equipment_shift_count: "TEST_ONLY",
      },
    };

    expect(canonicalApprovedBaselineRuntimeParameters(baseline)).toEqual({ work_included: true });
    expect(canonicalApprovedBaselineRuntimeDefaultValue(baseline, "delivery_mass_kg")).toBeNull();
    expect(canonicalApprovedBaselineParameterIsRuntimeEligible(baseline, "area_m2")).toBe(false);
  });

  test("preserves unclassified historical baseline behavior until a versioned migration", () => {
    const baseline = { input_values: { quantity_m2: 5 }, input_classification: {} };
    expect(canonicalApprovedBaselineRuntimeParameters(baseline)).toEqual({ quantity_m2: 5 });
    expect(canonicalApprovedBaselineRuntimeDefaultValue(baseline, "quantity_m2")).toBe(5);
  });

  test("does not restore an old negative applicability answer as a new project fact", () => {
    const baseline = {
      input_values: {
        repair_requirement_state: "NOT_REQUIRED",
        access_requirement_state: "INCLUDED_IN_CONTRACTOR_SCOPE",
        primer_requirement_state: "NOT_REQUIRED_BY_SELECTED_SYSTEM",
        normative_repair_requirement_state: "NOT_REQUIRED",
      },
      input_classification: {
        repair_requirement_state: "ASSUMPTION",
        access_requirement_state: "",
        primer_requirement_state: "NORMATIVE",
        normative_repair_requirement_state: "NORMATIVE",
      },
    };

    expect(canonicalApprovedBaselineRuntimeParameters(baseline)).toEqual({
      primer_requirement_state: "NOT_REQUIRED_BY_SELECTED_SYSTEM",
      normative_repair_requirement_state: "NOT_REQUIRED",
    });
    expect(canonicalApprovedBaselineRuntimeDefaultValue(
      baseline,
      "repair_requirement_state",
    )).toBeNull();
  });
});
