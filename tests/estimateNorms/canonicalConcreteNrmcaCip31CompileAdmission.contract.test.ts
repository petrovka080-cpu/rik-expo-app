import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";

const EXACT_PARAMETERS = {
  total_axis_length_m: 40,
  strip_width_m: 0.5,
  strip_height_m: 1.5,
  concrete_order_allowance_percent: 8,
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  plan_volume_calculation_reference: "KJ-4 axes 1-8/A-D rev.5",
  mix_design_or_project_specification_reference: "KJ-4 note 7; mix card RM-25-114",
  mixture_designation: "B25 W6 F150 P4, RM-25-114",
  placement_location: "Strip foundation axes 1-8/A-D, pour 1",
  placement_method: "pump",
  contingency_selection_justification: "Complex formwork and pump remainder per method statement",
  delivery_schedule_and_truck_capacity: "4 trucks x 8 m3; final load confirmed before dispatch",
  producer_order_confirmation: "RM-PRODUCER-2026-0912-17",
  estimator_approval_reference: "EST-APPROVAL-2026-0912-04",
} as const;

function input(parameters: Record<string, unknown>) {
  const formula = compileFormulaGraph(
    "total_axis_length_m * strip_width_m * strip_height_m * (1 + concrete_order_allowance_percent / 100)",
  );
  return {
    operation: "compile" as const,
    compilerVersion: "canonical-concrete-nrmca-cip31-admission-test",
    catalogId: "canonical-work:expanded:strip_foundation",
    primaryMeasureParameterId: "total_axis_length_m",
    parameterDefinitions: Object.keys(EXACT_PARAMETERS).map((parameterId) => ({
      parameter_id: parameterId,
      value_type: typeof EXACT_PARAMETERS[parameterId as keyof typeof EXACT_PARAMETERS] === "number"
        ? "decimal"
        : "text",
      required: [
        "total_axis_length_m",
        "strip_width_m",
        "strip_height_m",
        "concrete_order_allowance_percent",
      ].includes(parameterId),
      default_value: null,
      constraints_json: null,
    })),
    formulaDefinitions: [{
      formula_id: "concrete_order",
      ast: formula.ast,
      input_parameter_ids: formula.inputParameterIds,
      ast_sha256: "a".repeat(64),
    }],
    resourceDefinitions: [{
      id: "resource-ready-mix",
      row_id: "main_concrete",
      ordinal: 0,
      section: "Материалы",
      category: "material",
      title_ru: "Бетонная смесь B25 W6 F150 P4",
      unit_id: "m3",
      formula_id: "concrete_order",
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: {
        professionalPhysicalNormBindingV1: {
          technology_class: "REINFORCED_CONCRETE_STRIP_FOUNDATION",
          operation_class: "ORDER_READY_MIX",
          material_system: "READY_MIX_CONCRETE",
          scope_mode: "FULL_APPLICABLE_SCOPE",
          activation: {
            parameter_id: "product_profile_id",
            equals: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
          },
          parameter_projection_v1: {
            aliases: {
              selected_contingency_percent: "concrete_order_allowance_percent",
            },
            formulas: {
              plan_dimension_concrete_volume_m3:
                "total_axis_length_m * strip_width_m * strip_height_m",
            },
            units: {
              plan_dimension_concrete_volume_m3: "m3",
              selected_contingency_percent: "percent",
            },
          },
        },
      },
      procurement_eligible: true,
      cost_owner_id: null,
      source_metadata: {
        normativeTrace: [{
          source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
          norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
          source_document_version: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
          source_definition_hash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
        }],
      },
      row_sha256: "b".repeat(64),
    }],
    submittedParameters: parameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    rowOverrides: {},
    customRows: [],
    maximumResourceRows: 10,
    hashJson: (value: unknown) => JSON.stringify(value),
  };
}

describe("canonical compiler conditional NRMCA CIP 31 admission", () => {
  test("derives the plan volume and maps the selected contingency through the shared formula graph", async () => {
    const result = await compileCanonicalEstimateCore(input({ ...EXACT_PARAMETERS }));
    expect(result.rows[0]).toMatchObject({
      row_id: "main_concrete",
      quantity: "32.4",
      unit_price: null,
      amount: null,
      included_in_procurement: true,
    });
  });

  test("leaves the project-only calculation usable when the exact profile is not selected", async () => {
    const { product_profile_id: _profile, ...generic } = EXACT_PARAMETERS;
    const result = await compileCanonicalEstimateCore(input({
      ...generic,
      concrete_order_allowance_percent: 2,
    }));
    expect(result.rows[0]?.quantity).toBe("30.6");
  });

  test("rejects the former two percent allowance when the exact profile is selected", async () => {
    await expect(compileCanonicalEstimateCore(input({
      ...EXACT_PARAMETERS,
      concrete_order_allowance_percent: 2,
    }))).rejects.toMatchObject({ code: "PHYSICAL_NORM_APPLICABILITY_FAILED" });
  });
});
