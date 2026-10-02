import { buildConsumerCanonicalPrecompileParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterInputValue } from "../../src/lib/estimate/backendPlatform/contracts";
import { resolveCanonicalParameterVisibility } from "../../src/lib/estimate/canonicalParameters/canonicalParameterCore";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesJointResourcesR1";
import { ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesBeddingMaterialR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";

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

describe("mixed method/positive-thickness condition in the shared editable panel", () => {
  const methodId = "rcs_civil_installation_method";
  const thicknessId = "rcs_open_cut_full_width_bedding_thickness_m";
  const target = "rcs_bedding_gross_supplied_volume_ratio";
  const inputSpecs = [...ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1.filter(p => [methodId, thicknessId].includes(p.id)),
    ...ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1.filter(p => p.id === target)];
  const beddingCatalog: CanonicalEstimateCatalogItem = { ...catalog,
    parameterSchema: inputSpecs.map((p, ordinal) => ({ parameterId: p.id, ordinal, valueType: p.valueType, unitId: p.unitId,
      titleRu: p.title, required: p.kind !== "conditional", defaultValue: null, visibilityRole: "USER_INPUT",
      constraints: { ...(p.min == null ? {} : { min: p.min }), ...(p.requiredWhen ? {
        requiredWhen: "kind" in p.requiredWhen ? { ...p.requiredWhen } : { kind: "equals", ...p.requiredWhen },
      } : {}) }, formulaConsumers: ["test-owned-bedding-material"], resourceBranchConsumers: ["test-owned-bedding-resource"],
    })),
  };
  function beddingSession(parameters: Record<string, CanonicalEstimateParameterInputValue>, missingParameterIds = [target]) {
    return buildConsumerCanonicalPrecompileParameterSession({ catalog: beddingCatalog, draftId: "test-owned-bedding-draft",
      parameters, missingParameterIds, userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [] });
  }
  it.each<Record<string, CanonicalEstimateParameterInputValue>>([
    { [methodId]: methods.pipeJacking }, { [methodId]: methods.pipeJacking, [thicknessId]: 0.1 },
    { [methodId]: methods.openCut, [thicknessId]: 0 },
  ])("known false branch hides a stale material need but retains supplied input: %j", input => {
    const result = beddingSession({ ...input, [target]: 1.2 });
    expect(result.blockingMissingParameterIds).not.toContain(target);
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === target)).toMatchObject({ value: 1.2, source: "USER_EXPLICIT" });
    expect(buildCanonicalParameterCards({ session: result, revision: null }).some(c => c.key === target)).toBe(false);
  });
  it("reactivates the retained value as editable and filled instead of a new missing question", () => {
    const result = beddingSession({ [methodId]: methods.openCut, [thicknessId]: 0.1, [target]: 1.2 }, []);
    expect(result.blockingMissingParameterIds).toEqual([]);
    expect(buildCanonicalParameterCards({ session: result, revision: null }).find(c => c.key === target)).toMatchObject({ value: 1.2, editable: true, missing: false });
  });
  it("keeps positive-branch unknown consumption visible and does not infer a rate from thickness", () => {
    const result = beddingSession({ [methodId]: methods.openCut, [thicknessId]: 0.1 });
    expect(result.blockingMissingParameterIds).toEqual([target]);
    expect(result.parameters.find(p => p.parameterId === target)?.visibilityCondition).toMatchObject({ kind: "INCLUSION_GRAPH", ast: { kind: "and" } });
    expect(buildCanonicalParameterCards({ session: result, revision: null }).find(c => c.key === target)).toMatchObject({ value: null, editable: true, missing: true });
  });
  it("unknown thickness remains undecided rather than falsely zero, using the same tri-state graph", () => {
    const result = beddingSession({ [methodId]: methods.openCut }, [thicknessId, target]);
    expect(result.blockingMissingParameterIds).toContain(thicknessId);
    expect(result.blockingMissingParameterIds).toContain(target);
  });
});
