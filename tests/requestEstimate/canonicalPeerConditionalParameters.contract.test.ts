import { buildConsumerCanonicalPrecompileParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterInputValue } from "../../src/lib/estimate/backendPlatform/contracts";
import { resolveCanonicalParameterVisibility } from "../../src/lib/estimate/canonicalParameters/canonicalParameterCore";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesJointResourcesR1";

const L = "rcs_crossing_length_m";
const SECTION = "rcs_planned_physical_section_length_m";
const TARGET = "rcs_joint_gross_electrode_kg_per_joint";
const specs = [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1.filter(p => [L, SECTION].includes(p.id)),
  ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1.filter(p => p.id === TARGET)];
const catalog: CanonicalEstimateCatalogItem = {
  catalogId: "canonical-work:expanded:road_crossing_sleeves", releaseId: "test-owned-not-published", namespace: "global", domain: "roadworks",
  workKey: "road_crossing_sleeves", titleRu: "Футляр", definitionVersion: 1, applicability: {}, professionalMetadata: {},
  parameterSchema: specs.map((p, ordinal) => ({ parameterId: p.id, ordinal, valueType: p.valueType, unitId: p.unitId,
    titleRu: p.title, required: p.kind !== "conditional", defaultValue: null, visibilityRole: "USER_INPUT",
    constraints: { ...(p.min == null ? {} : { min: p.min }), ...(p.requiredWhen ? { requiredWhen: { ...p.requiredWhen } } : {}) },
    formulaConsumers: ["test-owned-site-joint-consumption"], resourceBranchConsumers: ["test-owned-joint-resource"],
  })),
};
function session(parameters: Record<string, CanonicalEstimateParameterInputValue>, missingParameterIds: string[] = [TARGET]) {
  return buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: "test-owned-peer-draft", parameters, missingParameterIds,
    userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [] });
}

describe("conditional peer applicability survives backend-session and card projection", () => {
  it.each([11, 12])("does not ask for a joint norm on a one-section crossing of %s metres", length => {
    // Even a retained obsolete backend need cannot revive a known false branch.
    const result = session({ [L]: length, [SECTION]: 12 });
    expect(result.parameters.map(p => p.parameterId)).toEqual([L, SECTION]);
    expect(result.blockingMissingParameterIds).toEqual([]);
    expect(result.contractMissingParameterIds).toEqual([]);
    expect(result.inactiveConditionalParameters?.map(p => p.parameterId)).toEqual([TARGET]);
    expect(buildCanonicalParameterCards({ session: result, revision: null }).map(c => c.key)).toEqual([L, SECTION]);
  });

  it("asks for the actual norm after crossing the physical-section boundary, not a calculated joint flag", () => {
    const result = session({ [L]: 12.001, [SECTION]: 12 });
    expect(result.blockingMissingParameterIds).toEqual([TARGET]);
    expect(result.parameters.find(p => p.parameterId === TARGET)).toMatchObject({
      visibilityCondition: { kind: "INCLUSION_GRAPH", ast: { kind: "greater_than", parameterId: L, valueParameterId: SECTION } },
      state: "BLOCKING_REQUIRED", value: null,
    });
    expect(buildCanonicalParameterCards({ session: result, revision: null }).find(c => c.key === TARGET)).toMatchObject({ missing: true, editable: true });
  });

  it("retains an inactive supplied norm without asking for it, and reactivates it as an editable explicit value", () => {
    const hidden = session({ [L]: 12, [SECTION]: 12, [TARGET]: 2 }, []);
    expect(hidden.parameters.some(p => p.parameterId === TARGET)).toBe(false);
    expect(hidden.inactiveConditionalParameters?.find(p => p.parameterId === TARGET)).toMatchObject({ value: 2, source: "USER_EXPLICIT" });
    const shown = session({ [L]: 24, [SECTION]: 12, [TARGET]: 2 }, []);
    expect(shown.blockingMissingParameterIds).toEqual([]);
    expect(buildCanonicalParameterCards({ session: shown, revision: null }).find(c => c.key === TARGET)).toMatchObject({ value: 2, editable: true, missing: false });
  });

  it("keeps an unknown peer an undecided selected need, not a false zero-joint branch", () => {
    const result = session({ [L]: 12 }, [SECTION, TARGET]);
    expect(result.blockingMissingParameterIds).toContain(TARGET);
    expect(buildCanonicalParameterCards({ session: result, revision: null }).some(c => c.key === TARGET)).toBe(true);
  });

  it("shares tri-state condition evaluation with the canonical parameter core", () => {
    const condition = { kind: "INCLUSION_GRAPH" as const, ast: { kind: "greater_than", parameterId: L, valueParameterId: SECTION } };
    expect(resolveCanonicalParameterVisibility(condition, new Map([[L, 12], [SECTION, 12]]))).toBe(false);
    expect(resolveCanonicalParameterVisibility(condition, new Map([[L, 12.001], [SECTION, 12]]))).toBe(true);
    expect(resolveCanonicalParameterVisibility(condition, new Map([[L, 12]]))).toBeNull();
  });
});
