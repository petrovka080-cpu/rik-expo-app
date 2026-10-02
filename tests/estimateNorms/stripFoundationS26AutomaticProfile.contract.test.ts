import { createHash } from "node:crypto";

import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2,
  STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
  STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2,
  STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2,
} from "../../src/lib/estimate/v4/stripFoundationProfessionalCompositionR2";

const USER_REVISION_4_PARAMETERS = Object.freeze({
  mobility: "P4",
  winter_mode: false,
  curing_method: "membrane",
  scope_variant: "full_reinforced_structure",
  strip_width_m: "0.5",
  concrete_class: "B25",
  formwork_sides: "2",
  strip_height_m: "2",
  watertightness: "W6",
  concrete_supply: "ready_mix",
  frost_resistance: "F150",
  placement_method: "pump",
  backfill_included: true,
  backfill_volume_m3: "2",
  total_axis_length_m: "150",
  binding_wire_mass_kg: "0.3",
  excavation_volume_m3: "10",
  groundworks_included: true,
  preparation_included: true,
  reinforcement_mass_t: "1",
  waterproofing_system: "bituminous_coating",
  waterproofing_area_m2: "500",
  soil_disposal_included: true,
  waterproofing_included: true,
  foundation_bedding_type: "sand",
  preparation_thickness_m: "1",
  formwork_transport_mass_t: "500",
  reinforcement_fabrication: "ready_cages",
  soil_disposal_distance_km: "5",
  delivery_separately_priced: true,
  excavated_soil_density_t_m3: "1.5",
  foundation_bedding_included: true,
  bedding_delivery_distance_km: "10",
  foundation_bedding_volume_m3: "2",
  concrete_delivery_distance_km: "0",
  formwork_delivery_distance_km: "0",
  concrete_order_allowance_percent: "0",
  reinforcement_delivery_distance_km: "0",
});

const baseline = Object.freeze(Object.fromEntries(
  STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2.flatMap((parameter) => {
    const value = parameter.defaultValue ?? (parameter.visibilityRole === "INTERNAL_ONLY"
      ? STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2[parameter.parameterId]
      : undefined);
    return value == null ? [] : [[parameter.parameterId, value]];
  }),
));

const sha256 = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex");

async function compile(overrides: Readonly<Record<string, unknown>> = {}) {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "s26-strip-foundation-automatic-profile-contract-test",
    catalogId: "canonical-work:expanded:strip_foundation",
    primaryMeasureParameterId: "total_axis_length_m",
    parameterDefinitions: STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2.map((parameter) => ({
      parameter_id: parameter.parameterId,
      value_type: parameter.valueType,
      required: parameter.requiredWhen == null ? parameter.required : false,
      default_value: parameter.defaultValue,
      constraints_json: {
        ...(parameter.choices ? { values: parameter.choices } : {}),
        ...(parameter.requiredWhen ? { requiredWhen: parameter.requiredWhen } : {}),
      },
      truth_metadata: {
        visibility_role: parameter.visibilityRole,
        value_source_role: parameter.sourceRole,
      },
    })),
    formulaDefinitions: STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2.map((formula) => ({
      formula_id: formula.formulaId,
      ast: formula.ast,
      input_parameter_ids: [...formula.inputParameterIds],
      ast_sha256: sha256(formula.ast),
    })),
    resourceDefinitions: STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2.map((row, ordinal) => ({
      id: `resource:${row.rowId}`,
      row_id: row.rowId,
      ordinal,
      section: row.section,
      category: row.category,
      title_ru: row.canonicalRuName,
      unit_id: row.normalizedUom,
      formula_id: row.formulaId,
      inclusion_ast: row.applicabilityExpression,
      resource_graph: {
        semanticOwnerId: row.semanticOwnerId,
        formulaId: row.formulaId,
        category: row.category,
        normalizedUom: row.normalizedUom,
        costOwnerId: row.costOwnerId,
        compositionOrigin: row.compositionOrigin,
        ...(row.includedInParentRate ? { costTreatment: "INCLUDED_IN_RESOURCE_ROWS" } : {}),
        ...(row.titleSpecificationParameterIds
          ? { titleSpecificationParameterIds: row.titleSpecificationParameterIds }
          : {}),
        ...(row.titleSpecificationMode ? { titleSpecificationMode: row.titleSpecificationMode } : {}),
        ...(row.titleSpecificationSeparator
          ? { titleSpecificationSeparator: row.titleSpecificationSeparator }
          : {}),
      },
      procurement_eligible: row.procurementEligible,
      cost_owner_id: row.costOwnerId,
      source_metadata: {
        ...row.sourceMetadata,
        normSource: row.normSource,
        normativeTrace: [row.normSource],
      },
      row_sha256: sha256(row),
    })),
    submittedParameters: { ...USER_REVISION_4_PARAMETERS, ...overrides },
    confirmedParameters: baseline,
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    rowOverrides: {},
    customRows: [],
    maximumResourceRows: 200,
    hashJson: sha256,
  });
}

describe("S26 automatic strip-foundation profile", () => {
  test("recalculates the exact 150 m historical input without professional quantity questions", async () => {
    const result = await compile();

    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(41);
    expect(result.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "main_concrete", quantity: "150", unit_id: "m3" }),
      expect.objectContaining({ row_id: "material:reinforcement:spacer-chairs", quantity: "2400", unit_id: "piece" }),
      expect.objectContaining({ row_id: "work:foundation:axis-setting-out-control", quantity: "150", unit_id: "m" }),
      expect.objectContaining({ row_id: "material:formwork:ties-accessories", quantity: "600", unit_id: "m2", included_in_estimate: false }),
      expect.objectContaining({ row_id: "material:formwork:release-agent", quantity: "6", unit_id: "l" }),
      expect.objectContaining({ row_id: "bituminous_waterproofing", quantity: "2000", unit_id: "l" }),
      expect.objectContaining({ row_id: "material:waterproofing:system-primer", quantity: "25", unit_id: "l" }),
      expect.objectContaining({ row_id: "material:waterproofing:protection-layer", quantity: "500", unit_id: "m2" }),
      expect.objectContaining({ row_id: "material:waterproofing:detail-reinforcement", quantity: "550", unit_id: "m2" }),
    ]));
  });

  test("changes only the sourced coating consumption when pressure exposure is confirmed", async () => {
    const result = await compile({ waterproofing_pressure_exposure: true });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find((row) => row.row_id === "bituminous_waterproofing")?.quantity).toBe("2500");
    expect(result.rows.find((row) => row.row_id === "material:waterproofing:system-primer")?.quantity).toBe("25");
  });
});
