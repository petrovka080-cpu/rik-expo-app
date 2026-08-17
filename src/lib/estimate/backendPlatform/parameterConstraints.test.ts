import {
  CanonicalParameterValidationError,
  validateCanonicalEstimateParameters,
  type CanonicalParameterDefinitionRecord,
} from "./parameterConstraints";

const catalogId = "drywall_ceiling_interior_bulkhead_clad_small_area";

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

describe("canonical backend parameter precedence", () => {
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
});
