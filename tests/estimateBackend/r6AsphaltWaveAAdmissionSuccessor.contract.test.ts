import { createHash } from "node:crypto";

import {
  canonicalApprovedBaselineRuntimeParameters,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  buildAllR555AsphaltCanonicalDefinitions,
} from "../../scripts/estimate/r555/asphaltCanonicalDefinitionsR555";
import {
  buildAllR6AsphaltWaveAAdmissionDefinitions,
} from "../../scripts/estimate/r6/asphaltWaveAAdmissionSuccessorR6";
import { restoredR6AsphaltRelatedInclusionAst } from "../../scripts/estimate/r6/asphaltRelatedConditionalInclusionR6";

const sha256 = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex");

describe("R6 Wave A backend admission successor", () => {
  const definitions = buildAllR555AsphaltCanonicalDefinitions();
  const admission = buildAllR6AsphaltWaveAAdmissionDefinitions(definitions);

  test("restores typed asphalt child conditions from the preserved resource provenance", () => {
    expect(restoredR6AsphaltRelatedInclusionAst({
      kind: "ASPHALT_RELATED",
      applicabilityRu: "drainage_required=true; typed child assembly professional-estimate-passport:v4:surface-drainage",
      inherited: { kind: "literal", value: true },
    })).toEqual({
      ast: { kind: "equals", parameterId: "drainage_required", value: true },
      controllingParameterId: "drainage_required",
      expectedValue: true,
    });
    expect(restoredR6AsphaltRelatedInclusionAst({
      kind: "ASPHALT_RELATED",
      applicabilityRu: "removal_method=true; typed child assembly professional-estimate-passport:v4:asphalt-removal-cold-milling",
      inherited: { kind: "literal", value: true },
    }).ast).toEqual({ kind: "equals", parameterId: "removal_method", value: "COLD_MILLING" });
    expect(restoredR6AsphaltRelatedInclusionAst({
      kind: "ASPHALT_WAVE_A",
      applicabilityRu: "drainage_required=true; typed child assembly professional-estimate-passport:v4:surface-drainage",
      inherited: { kind: "literal", value: true },
    }).ast).toEqual({ kind: "literal", value: true });
  });

  test("covers all 35 Wave A definition owners and leaves no unclassified parameter", () => {
    expect(admission).toHaveLength(35);
    for (const target of admission) {
      const definition = definitions.find((entry) => entry.catalogId === target.catalogId)!;
      expect(Object.keys(target.policyByParameterId).sort()).toEqual(
        definition.parameters.map((entry) => entry.parameterId).sort(),
      );
      expect(canonicalApprovedBaselineRuntimeParameters({
        input_values: target.validationInputValues,
        input_classification: target.inputClassification,
      })).toEqual(target.runtimeParameters);
      expect(new Set([
        ...target.userOrProjectParameterIds,
        ...target.sourceConfirmationParameterIds,
        ...target.derivedParameterIds,
      ]).size).toBe(definition.parameters.length);
    }
  });

  test("500 m2 repair is partial without fixture coefficients and completes with explicit inputs", async () => {
    const target = admission.find((entry) =>
      entry.canonicalTechnologyId.endsWith("_repair_standard")
    )!;
    const definition = definitions.find((entry) => entry.catalogId === target.catalogId)!;
    const compile = (submittedParameters: Record<string, string | number | boolean>) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "r6-asphalt-wave-a-admission-contract",
        catalogId: definition.catalogId,
        parameterDefinitions: definition.parameters.map((parameter) => {
          const policy = target.policyByParameterId[parameter.parameterId];
          return {
            parameter_id: parameter.parameterId,
            value_type: parameter.valueType,
            required: parameter.required,
            default_value: null,
            constraints_json: parameter.constraints,
            truth_metadata: {
              preliminary_compilation_allowed: policy.preliminaryCompilationAllowed,
            },
          };
        }),
        formulaDefinitions: definition.formulas.map((formula) => ({
          formula_id: formula.formulaId,
          ast: formula.ast,
          input_parameter_ids: formula.inputParameterIds,
          ast_sha256: formula.astSha256,
        })),
        resourceDefinitions: definition.resources.map((resource) => ({
          id: `r6:${resource.rowId}`,
          row_id: resource.rowId,
          ordinal: resource.ordinal,
          section: resource.section,
          category: resource.category,
          title_ru: resource.titleRu,
          unit_id: resource.unitId,
          formula_id: resource.formulaId,
          inclusion_ast: resource.inclusionAst,
          resource_graph: resource.resourceGraph,
          procurement_eligible: resource.procurementEligible,
          cost_owner_id: resource.costOwnerId,
          source_metadata: resource.sourceMetadata,
          row_sha256: resource.rowSha256,
        })),
        submittedParameters,
        confirmedParameters: target.runtimeParameters,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        priceItems: [],
        maximumResourceRows: 2_000,
        hashJson: sha256,
      });

    const partial = await compile({ area_m2: 500 });
    expect(partial.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(partial.preliminaryNeeds.some((need) =>
      need.missing_parameter_ids.includes("thickness_mm")
    )).toBe(true);
    expect(partial.preliminaryNeeds.some((need) =>
      need.missing_parameter_ids.includes("tack_coat_l_m2")
    )).toBe(true);
    expect(partial.rows.some((row) => row.quantity === "61.8" || row.quantity === "150")).toBe(false);

    const complete = await compile({
      ...target.validationInputValues,
      area_m2: 500,
      thickness_mm: 50,
      density_t_m3: 2.4,
      waste_factor: 1.03,
      tack_coat_l_m2: 0.3,
    });
    expect(complete.preliminaryNeeds).toHaveLength(0);
    expect(complete.rows).toHaveLength(definition.resources.length);
    const mix = complete.rows.find((row) => /смес/iu.test(String(row.title_ru)) && row.unit_id === "t");
    const tack = complete.rows.find((row) => /эмульс/iu.test(String(row.title_ru)) && row.unit_id === "l");
    expect(String(mix?.quantity)).toBe("61.8");
    expect(String(tack?.quantity)).toBe("150");
  });
});
