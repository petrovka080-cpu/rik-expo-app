import {
  isCatalogFirstEstimateKnownGeometryParameter,
  isCatalogFirstEstimateProjectSpecificRefinementParameter,
  sourceBackedPhysicalNormOutputParameterIds,
} from "./catalogFirstEstimateMinimumInputAudit.shared";

const sourceIdentity = {
  source_id: "source:knauf-d112",
  norm_id: "norm:knauf-d112-board",
  source_document_version: "2026-01",
  source_definition_hash: "sha256:verified",
};

function resource(input: {
  binding?: Record<string, unknown>;
  trace?: Record<string, unknown>;
}) {
  return {
    resource_graph: {
      professionalPhysicalNormBindingV1: input.binding,
    },
    source_metadata: {
      normativeTrace: input.trace == null ? [] : [input.trace],
    },
  };
}

describe("catalog first-estimate professional-source classification", () => {
  test("does not promote source-confirmed project quantities to initial geometry", () => {
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "area_m2",
      truth_metadata: {
        value_source_role: "USER_MEASURED",
        source_confirmation_required: false,
      },
    }, 500)).toBe(true);
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "edge_rail_length_m",
      truth_metadata: {
        value_source_role: "PROJECT_SPECIFIC_INPUT",
        source_confirmation_required: true,
      },
    }, 112)).toBe(false);
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "liquid_pvc_volume_l",
      truth_metadata: {
        value_source_role: "PROJECT_SPECIFIC_INPUT",
        source_confirmation_required: true,
      },
    }, 6.4)).toBe(false);
  });

  test("retains explicit counted work measures but rejects ordinary quantities", () => {
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "total_installed_mass_t",
      truth_metadata: {
        value_source_role: "USER_INPUT",
        source_confirmation_required: false,
      },
    }, 30)).toBe(true);
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "reinforced_membrane_quantity_m2",
      truth_metadata: { value_source_role: "PROJECT_SPECIFIC_INPUT" },
    }, 535)).toBe(false);
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "count",
      truth_metadata: {
        value_source_role: "USER_INPUT",
        input_origin_class: "KNOWN_WORK_SCOPE",
        source_confirmation_required: false,
      },
    }, 20)).toBe(true);
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "count",
      truth_metadata: {
        value_source_role: "USER_INPUT",
        source_confirmation_required: false,
      },
    }, 20)).toBe(false);
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "radiator_count",
      truth_metadata: {
        value_source_role: "USER_INPUT",
        input_origin_class: "KNOWN_WORK_SCOPE",
        source_confirmation_required: false,
      },
    }, 8)).toBe(true);
    expect(isCatalogFirstEstimateKnownGeometryParameter({
      parameter_id: "leak_test_count",
      truth_metadata: {
        value_source_role: "PROJECT_SPECIFIC_INPUT",
        source_confirmation_required: false,
      },
    }, 8)).toBe(false);
  });

  test("recognizes only exact versioned physical-norm outputs as already source-backed", () => {
    const result = sourceBackedPhysicalNormOutputParameterIds([resource({
      binding: {
        ...sourceIdentity,
        produced_parameter_ids: ["quantity_first_layer_gypsum_board"],
        quantity_output_parameter_id: "quantity_first_layer_screws",
      },
      trace: sourceIdentity,
    })]);

    expect([...result].sort()).toEqual([
      "quantity_first_layer_gypsum_board",
      "quantity_first_layer_screws",
    ]);
  });

  test.each([
    ["missing trace", undefined],
    ["wrong source", { ...sourceIdentity, source_id: "source:other" }],
    ["wrong norm", { ...sourceIdentity, norm_id: "norm:other" }],
    ["wrong version", { ...sourceIdentity, source_document_version: "2025-01" }],
    ["wrong hash", { ...sourceIdentity, source_definition_hash: "sha256:other" }],
  ])("keeps the output as a source gap for %s", (_label, trace) => {
    const result = sourceBackedPhysicalNormOutputParameterIds([resource({
      binding: {
        ...sourceIdentity,
        produced_parameter_ids: ["quantity_first_layer_gypsum_board"],
      },
      trace,
    })]);

    expect([...result]).toEqual([]);
  });

  test("does not infer ownership from an incomplete binding", () => {
    const result = sourceBackedPhysicalNormOutputParameterIds([resource({
      binding: {
        source_id: sourceIdentity.source_id,
        produced_parameter_ids: ["quantity_first_layer_gypsum_board"],
      },
      trace: sourceIdentity,
    })]);

    expect([...result]).toEqual([]);
  });

  test.each([
    "PROJECT_SPECIFIC_INPUT",
    "PROJECT_DOCUMENTATION",
    "ENGINEERING_DESIGN",
    "SITE_SURVEY",
    "SELECTED_EQUIPMENT_PASSPORT",
    "MATERIAL_PASSPORT_VALUE",
    "MANUFACTURER_CONFIRMED",
  ])("separates %s from a missing universal norm", (valueSourceRole) => {
    expect(isCatalogFirstEstimateProjectSpecificRefinementParameter({
      truth_metadata: { value_source_role: valueSourceRole },
    })).toBe(true);
  });

  test.each([
    "NORM_REQUIRED_BUT_PROJECT_SELECTED",
    "BACKEND_DERIVED",
  ])("keeps %s in managed professional-source analysis", (valueSourceRole) => {
    expect(isCatalogFirstEstimateProjectSpecificRefinementParameter({
      truth_metadata: { value_source_role: valueSourceRole },
    })).toBe(false);
  });

  test.each([
    "cut_protection_rate_kg_m",
    "profile_screw_rate_item_m2",
  ])("restores the project-value ownership lost by the legacy drywall serializer for %s", (parameterId) => {
    expect(isCatalogFirstEstimateProjectSpecificRefinementParameter({
      parameter_id: parameterId,
      truth_metadata: { value_source_role: "BACKEND_DERIVED" },
    })).toBe(true);
  });

  test("separates explicitly project-defined user input from a missing universal norm", () => {
    expect(isCatalogFirstEstimateProjectSpecificRefinementParameter({
      truth_metadata: {
        value_source_role: "USER_INPUT",
        guide: { guide_kind: "PROJECT_DEFINED" },
      },
    })).toBe(true);
    expect(isCatalogFirstEstimateProjectSpecificRefinementParameter({
      truth_metadata: { value_source_role: "USER_INPUT" },
    })).toBe(false);
  });

  test("separates a project-selected value within a published manufacturer range", () => {
    expect(isCatalogFirstEstimateProjectSpecificRefinementParameter({
      truth_metadata: {
        value_source_role: "NORM_REQUIRED_BUT_PROJECT_SELECTED",
        guide: { guide_kind: "MANUFACTURER_RANGE" },
      },
    })).toBe(true);
    expect(isCatalogFirstEstimateProjectSpecificRefinementParameter({
      truth_metadata: {
        value_source_role: "NORM_REQUIRED_BUT_PROJECT_SELECTED",
        guide: { guide_kind: "NORMATIVE_RANGE" },
      },
    })).toBe(false);
  });
});
