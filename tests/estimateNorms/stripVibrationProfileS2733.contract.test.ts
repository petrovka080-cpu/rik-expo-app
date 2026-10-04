import { ANCHOR_GROUP_VIBRATION_PARAMETERS, ANCHOR_GROUP_VIBRATION_FORMULAS, ANCHOR_GROUP_VIBRATION_RESOURCES, anchorGroupVibrationAcceptanceInputR1 } from "../../src/lib/estimate/v4/anchorGroupVibrationR1";
import { buildVibrationOperationCompletionS2733, VIBRATION_COMPLETION_ROWS as ids } from "../../src/lib/estimate/v4/vibrationOperationCompletionS2733";
import { overlayS2733StripVibrationKitClosure } from "../../scripts/estimate/r4a13/s2733StripVibrationKitClosureOverlay";
import type { PurchaseGroupRepresentative } from "../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";

const addition = buildVibrationOperationCompletionS2733("source-fixture");
const source: PurchaseGroupRepresentative = structuredClone({
  definition: { id: "delivered-source-fixture", catalog_id: "canonical-work:base:concrete_foundation_interior_anchor_group_vibrate_high_load", passport: {}, source_metadata: {},
    applicability: { approvedMethod: "INTERNAL_VIBRATION", universalProductivityClaimed: false } },
  parameters: [...ANCHOR_GROUP_VIBRATION_PARAMETERS, ...addition.parameters.filter(p => !ANCHOR_GROUP_VIBRATION_PARAMETERS.some(old => old.parameter_id === p.parameter_id))],
  formulas: [...ANCHOR_GROUP_VIBRATION_FORMULAS, ...addition.formulas],
  resources: [...ANCHOR_GROUP_VIBRATION_RESOURCES, ...addition.resources].map(row => ({ ...row,
    row_type: row.category === "construction_work" ? "labor" : row.category === "delivery" ? "service" : row.category,
    resource_graph: { ...row.resource_graph, operationCompositionV1: { operationId: "vibration" },
      ...(row.row_id === ids.includedKit ? { inputParameterIds: ["vibration_equipment_accessories_specification"] } : {}) } })),
  bindings: [], passport: { physical_result_ru: "source fixture", included_scope_ru: [], excluded_scope_ru: [] },
  baseline: { input_values: anchorGroupVibrationAcceptanceInputR1("high_load"), input_classification: {}, proposal_source_refs: [],
    guide_provenance_ru: {}, formula_consumer_ids: {}, resource_consumer_row_ids: {}, normative_source_ids: {}, uom_by_parameter: {} },
});
const parent: PurchaseGroupRepresentative = { ...source,
  definition: { ...source.definition, catalog_id: "canonical-work:base:concrete_foundation_interior_strip_foundation_vibrate_high_load",
    source_metadata: { contract: "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2" } },
  parameters: [{ parameter_id: "q", default_value: 100 }], resources: Array.from({ length: 59 }, (_, i) => ({ row_id: `obsolete:${i}` })), formulas: [{ input_parameter_ids: ["q"] }] };
const next = overlayS2733StripVibrationKitClosure(parent, source).representative;
const facts = { ...next.baseline.input_values, vibration_equipment_accessories_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE",
  vibration_equipment_accessories_specification: "DEMO per kit: 1 compatible head, 1 flexible shaft, 2 coupling pins, 1 brush, 2 cleaning wipes and 1 L cleaning water; included in equipment quote",
  vibration_equipment_accessories_set_count: 2 };
const compile = (parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "strip-vibration-profile-test", catalogId: String(next.definition.catalog_id), primaryMeasureParameterId: "consolidated_concrete_volume_m3",
  parameterDefinitions: next.parameters as unknown as CanonicalEstimateCompileCoreInput["parameterDefinitions"], formulaDefinitions: next.formulas as unknown as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
  resourceDefinitions: next.resources as unknown as CanonicalEstimateCompileCoreInput["resourceDefinitions"], submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS", maximumResourceRows: 6, rowOverrides, hashJson: estimateDeterministicHash });

describe("S27.33 fresh strip foundation vibration reuse", () => {
  it("reuses actual labor, equipment and counted BOM without concrete, steel, formwork or duplicate kit cost", async () => {
    const result = await compile(facts, { [ids.equipment]: { unitPrice: 10, provenance: { kind: "manual", reason: "DEMO complete equipment rate" } } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === "work:concrete:anchor-group-vibration")?.quantity).toBe("32");
    expect(result.rows.find(row => row.row_id === ids.equipment)).toMatchObject({ quantity: "9", amount: "90" });
    expect(result.rows.find(row => row.row_id === ids.includedKit)).toMatchObject({ quantity: "2", included_in_estimate: false, included_in_procurement: false, amount: null });
    expect(next.formulas).toEqual(source.formulas);
    expect(next.resources).toHaveLength(6); expect(next.parameters).toHaveLength(16);
    expect(next.parameters.every(p => p.default_value == null && p.parameter_id !== "q")).toBe(true);
    expect(Object.values(next.baseline.input_classification).every(v => v === "VALIDATION_FIXTURE")).toBe(true);
    expect(next.definition.passport.canonicalRuName).toContain("ленточного фундамента");
  });
  it("saves a local preliminary composition with missing labor/equipment instead of a q=100 recipe", async () => {
    const result = await compile({ consolidated_concrete_volume_m3: 3, approved_consolidation_method: "INTERNAL_VIBRATION" });
    expect(result.preliminaryNeeds.some(row => row.missing_parameter_ids.includes("vibration_worker_h"))).toBe(true);
    expect(result.rows.some(row => row.row_id === ids.equipment)).toBe(false);
    expect(result.preliminaryNeeds.length).toBeLessThanOrEqual(6);
  });
  it("preserves an actual count need under a manual included-kit quantity", async () => {
    const result = await compile({ ...facts, vibration_equipment_accessories_set_count: null },
      { [ids.includedKit]: { quantity: "2", provenance: { kind: "manual", reason: "DEMO supplier count; actual project takeoff missing" } } });
    expect(result.preliminaryNeeds.find(row => row.row_id === ids.includedKit)?.missing_parameter_ids).toContain("vibration_equipment_accessories_set_count");
    expect(result.rows.find(row => row.row_id === ids.equipment)?.quantity).toBe("9");
  });
  it("rejects physical or out-of-scope predecessors instead of replacing them with a fixture", () => {
    expect(() => overlayS2733StripVibrationKitClosure({ ...parent, resources: parent.resources.slice(1) }, source)).toThrow("EXACT_OBSOLETE_RECIPE_REQUIRED");
    expect(() => overlayS2733StripVibrationKitClosure({ ...parent, definition: { ...parent.definition, catalog_id: "other" } }, source)).toThrow("FINITE_SCOPE");
  });
});
