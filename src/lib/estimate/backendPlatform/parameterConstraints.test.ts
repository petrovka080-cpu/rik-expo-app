import {
  CanonicalParameterValidationError,
  validateCanonicalEstimateParameters,
  type CanonicalParameterDefinitionRecord,
} from "./parameterConstraints";

const catalogId = "drywall_ceiling_interior_bulkhead_clad_small_area";
const approvedBaselineId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const acceptanceEvidenceSha256 = "b".repeat(64);

function acceptedDefinition(bindingPatch: Record<string, unknown> = {}): CanonicalParameterDefinitionRecord {
  return {
    parameter_id: "quantity_m2",
    value_type: "decimal",
    required: true,
    default_value: 5,
    constraints_json: { min: 1, max: 10 },
    truth_metadata: {
      value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
      baseline_assumption_id: "accepted-baseline:quantity_m2",
      formula_consumers: ["formula:quantity"],
      resource_branch_consumers: ["row:material"],
      provenance: {
        baselineOwner: "accepted-batch-formula-graph-v3-baseline:r53",
        sourceCatalogId: catalogId,
        sourceReleaseId: "release-batch008",
        sourceDefinitionVersionId: "definition-v5",
        sourceDefinitionVersion: 5,
        sourceParameterSchemaId: "schema-sha256",
        sourceParameterSchemaVersion: "definition:5",
        acceptedTraceBindings: [{
          catalogId,
          parameterId: "quantity_m2",
          value: 5,
          releaseId: "release-batch008",
          definitionVersionId: "definition-v5",
          definitionVersion: 5,
          parameterSchemaId: "schema-sha256",
          parameterSchemaVersion: "definition:5",
          acceptedBatch: "BATCH008",
          traceId: "trace:quantity",
          formulaId: "formula:quantity",
          resourceRowId: "row:material",
          normativeSourceIds: ["KG_NORM_1"],
          ...bindingPatch,
        }],
      },
    },
  };
}

function approvedDefinition(bindingPatch: Record<string, unknown> = {}): CanonicalParameterDefinitionRecord {
  return {
    parameter_id: "quantity_m2",
    value_type: "decimal",
    required: true,
    default_value: 5,
    approved_template_baseline_id: approvedBaselineId,
    constraints_json: { min: 1, max: 10 },
    truth_metadata: {
      value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
      baseline_assumption_id: `${approvedBaselineId}:quantity_m2`,
      formula_consumers: ["formula:quantity"],
      resource_branch_consumers: ["row:material"],
      provenance: {
        baselineOwner: "approved-template-baseline:r54",
        sourceCatalogId: catalogId,
        sourceReleaseId: "release-batch008",
        sourceDefinitionVersionId: "definition-v5",
        sourceDefinitionVersion: 5,
        sourceParameterSchemaId: "schema-sha256",
        sourceParameterSchemaVersion: "definition:5",
        approvedTemplateBaselineId: approvedBaselineId,
        acceptanceEvidenceSha256,
        approvedTemplateBinding: {
          baselineId: approvedBaselineId,
          catalogId,
          parameterId: "quantity_m2",
          value: 5,
          inputClassification: "ASSUMPTION",
          definitionVersionId: "definition-v5",
          parameterSchemaSha256: "schema-sha256",
          formulaConsumerIds: ["formula:quantity"],
          resourceConsumerRowIds: ["row:material"],
          normativeSourceIds: [],
          acceptanceEvidenceSha256,
          ...bindingPatch,
        },
      },
    },
  };
}

describe("canonical backend parameter precedence", () => {
  it("evaluates both persisted InclusionGraph and legacy equals conditional shapes", () => {
    const definitions: CanonicalParameterDefinitionRecord[] = [
      {
        parameter_id: "system_type",
        value_type: "text",
        required: true,
        default_value: null,
        constraints_json: {},
      },
      {
        parameter_id: "tray_size",
        value_type: "text",
        required: false,
        default_value: null,
        constraints_json: {
          requiredWhen: { kind: "equals", parameterId: "system_type", value: "linear_tray" },
        },
      },
      {
        parameter_id: "inspection_required",
        value_type: "boolean",
        required: false,
        default_value: null,
        constraints_json: {
          requiredWhen: { parameterId: "system_type", equals: "storm_sewer" },
        },
      },
    ];

    expect(validateCanonicalEstimateParameters(definitions, { system_type: "subsurface_drain" }))
      .toEqual({ system_type: "subsurface_drain" });
    expect(() => validateCanonicalEstimateParameters(definitions, { system_type: "linear_tray" }))
      .toThrow("missing parameter tray_size");
    expect(() => validateCanonicalEstimateParameters(definitions, { system_type: "storm_sewer" }))
      .toThrow("missing parameter inspection_required");
  });

  it("uses the accepted per-work baseline when no refinement exists", () => {
    expect(validateCanonicalEstimateParameters([acceptedDefinition()], {}, {
      baselineContext: { catalogId },
    })).toEqual({ quantity_m2: 5 });
  });

  it("gives confirmed refinement priority over the accepted baseline", () => {
    expect(validateCanonicalEstimateParameters([acceptedDefinition()], {}, {
      confirmedParameters: { quantity_m2: 7 },
      baselineContext: { catalogId },
    })).toEqual({ quantity_m2: 7 });
  });

  it("gives current user input priority over refinement and baseline", () => {
    expect(validateCanonicalEstimateParameters([acceptedDefinition()], { quantity_m2: 9 }, {
      confirmedParameters: { quantity_m2: 7 },
      baselineContext: { catalogId },
    })).toEqual({ quantity_m2: 9 });
  });

  it("rejects a cross-work accepted binding instead of manufacturing a passport", () => {
    expect(() => validateCanonicalEstimateParameters([
      acceptedDefinition({ catalogId: "another-work" }),
    ], {}, {
      baselineContext: { catalogId },
    })).toThrow(CanonicalParameterValidationError);
  });

  it("does not silently discard unknown confirmed parameters", () => {
    expect(() => validateCanonicalEstimateParameters([acceptedDefinition()], {}, {
      confirmedParameters: { another_work_quantity: 7 },
      baselineContext: { catalogId },
    })).toThrow("unknown confirmed estimate parameters");
  });

  it("uses an immutable approved per-work template baseline", () => {
    expect(validateCanonicalEstimateParameters([approvedDefinition()], {}, {
      baselineContext: { catalogId },
    })).toEqual({ quantity_m2: 5 });
  });

  it("rejects an approved template binding from another work", () => {
    expect(() => validateCanonicalEstimateParameters([
      approvedDefinition({ catalogId: "another-work" }),
    ], {}, {
      baselineContext: { catalogId },
    })).toThrow("invalid approved template baseline binding");
  });

  it("rejects an approved value that is not the immutable asset value", () => {
    expect(() => validateCanonicalEstimateParameters([
      approvedDefinition({ value: 6 }),
    ], {}, {
      baselineContext: { catalogId },
    })).toThrow("invalid approved template baseline binding");
  });
});
