import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";

const PARAMETERS = {
  product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "FW-149-REV-A",
  element_type: "WALL",
  element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A",
  estimator_approval_reference: "EST-FW-149",
} as const;

function input(parameters: Record<string, unknown>) {
  const formula = compileFormulaGraph("round_to(measured_formwork_contact_area_m2 * 1, 4)");
  return {
    operation: "compile" as const,
    compilerVersion: "canonical-physical-norm-admission-test",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    parameterDefinitions: Object.keys(PARAMETERS).map((parameterId) => ({
      parameter_id: parameterId,
      value_type: typeof PARAMETERS[parameterId as keyof typeof PARAMETERS] === "number" ? "decimal" : "text",
      required: true,
      default_value: parameterId === "product_profile_id" ? RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID : null,
      constraints_json: null,
    })),
    formulaDefinitions: [{
      formula_id: "rics_nrm2_formwork_measured_contact_area_v1",
      ast: formula.ast,
      input_parameter_ids: formula.inputParameterIds,
      ast_sha256: "a".repeat(64),
    }],
    resourceDefinitions: [{
      id: "resource-formwork-rics",
      row_id: "formwork:rics-nrm2:measured-contact-area:work",
      ordinal: 0,
      section: "Работы",
      category: "construction_work",
      title_ru: "Монтаж и демонтаж опалубки по измеренной площади контакта",
      unit_id: "m2",
      formula_id: "rics_nrm2_formwork_measured_contact_area_v1",
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: {
        professionalPhysicalNormBindingV1: {
          technology_class: "FORMWORK_MEASUREMENT",
          operation_class: "MEASURE",
          material_system: "FORMWORK_CONTACT_AREA",
          scope_mode: "FULL_APPLICABLE_SCOPE",
          product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
          applicability_parameter_ids: Object.keys(PARAMETERS).filter(
            (parameterId) => parameterId !== "product_profile_id",
          ),
        },
      },
      procurement_eligible: false,
      cost_owner_id: null,
      source_metadata: {
        normativeTrace: [{
          source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
          norm_id: RICS_NRM2_FORMWORK_NORM_ID,
          source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
          source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
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

describe("canonical compiler physical norm admission", () => {
  test("keeps the valid exact quantity in the existing canonical core", async () => {
    const result = await compileCanonicalEstimateCore(input({ ...PARAMETERS }));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.quantity).toBe("100");
    expect(result.rows[0]?.unit_price).toBeNull();
  });

  test("blocks an invalid physical applicability before a revision can be committed", async () => {
    await expect(compileCanonicalEstimateCore(input({
      ...PARAMETERS,
      project_measurement_rule_reference: "UNCONFIRMED",
    }))).rejects.toMatchObject({ code: "PHYSICAL_NORM_APPLICABILITY_FAILED" });
  });

  test("keeps an incomplete physical norm row visible until its project basis is supplied", async () => {
    const { project_drawing_reference: _missing, ...minimum } = PARAMETERS;
    const result = await compileCanonicalEstimateCore(input({ ...minimum }));
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toEqual([
      expect.objectContaining({
        row_id: "formwork:rics-nrm2:measured-contact-area:work",
        quantity: "100",
        need_state: "QUANTITY_REQUIRED",
        missing_parameter_ids: ["project_drawing_reference"],
      }),
    ]);
  });
});
