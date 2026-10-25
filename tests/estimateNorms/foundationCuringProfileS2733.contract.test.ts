import { measuredConcreteProjectInputR533 } from "./fixtures/concreteMeasuredProjectInputsR533";
import { CONCRETE_SLAB_CURING_PARAMETERS, CONCRETE_SLAB_CURING_FORMULAS, CONCRETE_SLAB_CURING_RESOURCES, concreteSlabCuringAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabCuringR1";
import { buildCuringOperationCompletionS2733, CURING_COMPLETION_ROWS as ids } from "../../src/lib/estimate/v4/curingOperationCompletionS2733";
import { overlayS2732PurchaseGroup, type PurchaseGroupRepresentative } from "../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay";
import { overlayS2733FoundationCuringProfile } from "../../scripts/estimate/r4a13/s2733FoundationCuringProfileOverlay";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { CURING_MATERIAL_ACCESSORIES_ROWS as kits } from "../../src/lib/estimate/v4/curingMaterialAccessoriesS2733";
import { mergeCanonicalEffectiveResourceQuantityProvenanceV1 } from "../../src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1";

const addition = buildCuringOperationCompletionS2733("existing-curing-test");
const added = addition.resources.filter(r => r.row_id !== ids.water), addedFormulaIds = new Set(added.map(r => r.formula_id));
const water = addition.resources.find(r => r.row_id === ids.water)!;
const source: PurchaseGroupRepresentative = structuredClone({ definition: { catalog_id: "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_high_load", id: "source-fixture",
  source_metadata: { contract: "existing-delivered-curing" }, passport: {}, applicability: { universalConsumptionClaimed: false, universalProductivityClaimed: false } },
  parameters: [...CONCRETE_SLAB_CURING_PARAMETERS, ...addition.parameters.filter(p => !CONCRETE_SLAB_CURING_PARAMETERS.some(old => old.parameter_id === p.parameter_id))],
  formulas: [...CONCRETE_SLAB_CURING_FORMULAS, ...addition.formulas.filter(f => addedFormulaIds.has(f.formula_id))],
  resources: [...CONCRETE_SLAB_CURING_RESOURCES.map(r => r.row_id === ids.water ? { ...r, resource_graph: { ...r.resource_graph,
    effectiveQuantityOutputV1: water.resource_graph.effectiveQuantityOutputV1, purchaseBalanceV1: water.resource_graph.purchaseBalanceV1 } } : r), ...added].map(r => ({ ...r,
      row_type: r.category === "construction_work" ? "labor" : r.category === "delivery" ? "service" : r.category,
      resource_graph: { ...r.resource_graph, operationCompositionV1: { operationId: "curing" } } })),
  bindings: [], passport: { physical_result_ru: "existing curing", included_scope_ru: [], excluded_scope_ru: [] },
  baseline: { input_values: concreteSlabCuringAcceptanceInputR1("high_load"), input_classification: {}, formula_consumer_ids: {}, resource_consumer_row_ids: {}, uom_by_parameter: {}, normative_source_ids: {}, guide_provenance_ru: {}, proposal_source_refs: [] } });
const complete = (context: Parameters<typeof concreteSlabCuringAcceptanceInputR1>[0] | "compact" | "extended") => ({ ...(context === "compact" || context === "extended" ? measuredConcreteProjectInputR533("concreteSlabCuringAcceptanceInputR1", context) : concreteSlabCuringAcceptanceInputR1(context)),
  ...(context !== "compact" ? { application_equipment_accessories_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE",
    application_equipment_accessories_specification: "DEMO per complete set: 2 compatible hoses, 4 couplings, 1 sprinkler, included in equipment rate", application_equipment_accessories_set_count: 2 } : {}),
  ...(["standard", "high_load", "wet_zone"].includes(context) ? { curing_water_delivery_mode: "ON_SITE_SUPPLY" } : {}) });
const amendment = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed supplier order" } });
const locatorId = "336329ad-74c7-5bfc-bbc1-1ae3e64e9aa2";
const next = overlayS2733FoundationCuringProfile(source, source, locatorId).representative;
const withoutAdditionalKit = (context: Parameters<typeof complete>[0]) => ({ ...complete(context),
  ...(["standard", "compact", "extended", "technical_room"].includes(context) ? { curing_material_accessories_pricing_mode: "NOT_REQUIRED" } : {}) });
const kitFacts = { curing_material_accessories_pricing_mode: "INCLUDED_IN_CURING_MATERIAL_RATE",
  curing_material_accessories_specification: "DEMO per one kit: 1 compatible sealing tape roll, 8 fixings and 4 protection weights; included in sheet material price",
  curing_material_accessories_set_count: 2 };
function compile(r: PurchaseGroupRepresentative, parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) {
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s2733-curing-profile-test", catalogId: String(r.definition.catalog_id), primaryMeasureParameterId: "cured_concrete_volume_m3",
    parameterDefinitions: r.parameters as unknown as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
    formulaDefinitions: r.formulas as unknown as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
    resourceDefinitions: r.resources as unknown as CanonicalEstimateCompileCoreInput["resourceDefinitions"],
    submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS", maximumResourceRows: r.resources.length, rowOverrides, hashJson: estimateDeterministicHash });
}
describe("S27.33 existing curing profile and all method material orders", () => {
  it.each([
    ["standard", "material:concrete:wet-curing-covering", "95.5", "92", "3.5"],
    ["compact", "material:concrete:impervious-curing-sheet", "25.25", "22", "3.25"],
    ["extended", "material:concrete:membrane-curing-compound", "91.25", "82.5", "8.75"],
  ] as const)("reconciles %s supplier order without changing labor, equipment, water or method", async (context, rowId, order, consumed, remaining) => {
    const old = await compile(source, complete(context)), changed = await compile(next, withoutAdditionalKit(context), { [rowId]: amendment(order) });
    expect(changed.preliminaryNeeds).toEqual([]);
    expect(changed.rows.find(r => r.row_id === rowId)?.calculation_trace).toMatchObject({ purchaseBalance: { consumed, remaining, procurementReady: true } });
    expect(changed.rows.filter(r => r.row_id !== rowId).map(r => [r.row_id, r.quantity])).toEqual(old.rows.filter(r => r.row_id !== rowId).map(r => [r.row_id, r.quantity]));
  });
  it("blocks insufficient sheet supply and preserves missing takeoff even with a manual order", async () => {
    const rowId = "material:concrete:impervious-curing-sheet";
    const shortage = await compile(next, withoutAdditionalKit("compact"), { [rowId]: amendment("0") });
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "fixture", release_id: "fixture", catalog_id: "fixture", checksum_sha256: "fixture", row_count: shortage.rows.length }, ...selectCanonicalArtifactRows(shortage.rows) })).toThrow();
    const unknown = await compile(next, { ...withoutAdditionalKit("compact"), impervious_sheet_area_m2: null }, { [rowId]: amendment("25.25") });
    expect(unknown.preliminaryNeeds.find(r => r.row_id === rowId)?.missing_parameter_ids).toContain("impervious_sheet_area_m2");
  });
  it("reuses the delivered profile only for exact obsolete recipes, with no old q default or concrete/steel/formwork scope", () => {
    const parent: PurchaseGroupRepresentative = { ...source, definition: { ...source.definition, catalog_id: "canonical-work:base:concrete_foundation_interior_strip_foundation_cure_standard",
      source_metadata: { contract: "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2" } }, parameters: [{ parameter_id: "q", default_value: 100 }],
      resources: Array.from({ length: 59 }, (_, i) => ({ row_id: `obsolete:${i}` })), formulas: [{ input_parameter_ids: ["q"] }] };
    const r = overlayS2733FoundationCuringProfile(parent, source, locatorId).representative;
    expect(r.resources).toHaveLength(15); expect(r.parameters).toHaveLength(37);
    expect(r.parameters.every(p => p.default_value == null)).toBe(true);
    expect(r.parameters.some(p => p.parameter_id === "q")).toBe(false);
    expect(Object.values(r.baseline.input_classification).every(v => v === "VALIDATION_FIXTURE")).toBe(true);
    expect(r.definition.passport.canonicalRuName).toContain("ленточного фундамента");
    expect(() => overlayS2733FoundationCuringProfile({ ...parent, resources: parent.resources.slice(1) }, source, locatorId)).toThrow("OBSOLETE_RECIPE_SCOPE_DRIFT");
  });
  it("shows the counted sheet kit inside the actual sheet owner price once", async () => {
    const sheet = "material:concrete:impervious-curing-sheet";
    const result = await compile(next, { ...complete("compact"), ...kitFacts },
      { [sheet]: { unitPrice: 2, provenance: { kind: "manual", reason: "DEMO sheet quote includes counted fixing, sealing and protection kit" } } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === sheet)).toMatchObject({ quantity: "22", amount: "44" });
    expect(result.rows.find(r => r.row_id === kits.sheet)).toMatchObject({ quantity: "2", amount: null, included_in_estimate: false, included_in_procurement: false });
    expect(result.rows.find(r => r.row_id === kits.sheet)?.calculation_trace).toMatchObject({ resourceGraph: { includedInResourceOwnerRowId: sheet } });
    expect(result.rows.some(r => new Set<string>([kits.wet, kits.compound, kits.separate]).has(r.row_id))).toBe(false);
  });
  it("orders complete separate material kits, blocks shortage and rejects fractional supply", async () => {
    const facts = { ...complete("compact"), ...kitFacts, curing_material_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const ordered = await compile(next, facts, { [kits.separate]: amendment("3") });
    expect(ordered.preliminaryNeeds).toEqual([]);
    expect(ordered.rows.find(r => r.row_id === kits.separate)?.calculation_trace).toMatchObject({ purchaseBalance: { consumed: "2", remaining: "1", procurementReady: true } });
    expect(selectCanonicalArtifactRows(ordered.rows).procurementRows.some(r => r.row_id === kits.separate)).toBe(true);
    const short = await compile(next, facts, { [kits.separate]: amendment("0") });
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "fixture", release_id: "fixture", catalog_id: "fixture", checksum_sha256: "fixture", row_count: short.rows.length }, ...selectCanonicalArtifactRows(short.rows) })).toThrow();
    await expect(compile(next, facts, { [kits.separate]: amendment("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("keeps missing counted BOM local despite a manual kit order", async () => {
    const result = await compile(next, { ...complete("compact"), ...kitFacts, curing_material_accessories_pricing_mode: "SEPARATE_SUPPLY", curing_material_accessories_specification: null },
      { [kits.separate]: amendment("3") });
    expect(result.preliminaryNeeds.find(r => r.row_id === kits.separate)?.missing_parameter_ids).toContain("curing_material_accessories_specification");
    expect(result.rows.find(r => r.row_id === "material:concrete:impervious-curing-sheet")?.quantity).toBe("22");
    expect(result.rows.find(r => r.row_id === "work:concrete:slab-curing")?.quantity).toBe("7");
    const missingCount = await compile(next, { ...complete("compact"), ...kitFacts, curing_material_accessories_set_count: null },
      { [kits.sheet]: amendment("2") });
    expect(missingCount.preliminaryNeeds.find(r => r.row_id === kits.sheet)?.missing_parameter_ids).toContain("curing_material_accessories_set_count");
  });
  it("keeps legacy default scope closed and rejects combined owner options", () => {
    expect(() => overlayS2732PurchaseGroup(source)).toThrow("UNKNOWN_CATALOG");
    expect(() => overlayS2732PurchaseGroup(source, { curingMaterialOwners: true, reinforcementOwners: true })).toThrow("OWNER_SCOPE_CONFLICT");
  });
  it("removes inherited effective order provenance when physical takeoff is cleared and refreshes a changed order", async () => {
    const facts = withoutAdditionalKit("compact"), parent = await compile(next, facts);
    const sourceParameters = { ...facts, ...parent.derivedParameters }, changedFacts = { ...facts, impervious_sheet_area_m2: null };
    const pending = await compile(next, changedFacts, { "material:concrete:impervious-curing-sheet": amendment("25.25") });
    const merge = (userParameters: Record<string, unknown>, derivedParameters: Record<string, unknown>) => mergeCanonicalEffectiveResourceQuantityProvenanceV1({
      parameterDefinitions: next.parameters as unknown as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
      resourceDefinitions: next.resources as unknown as CanonicalEstimateCompileCoreInput["resourceDefinitions"],
      formulaDefinitions: next.formulas as unknown as CanonicalEstimateCompileCoreInput["formulaDefinitions"], userParameters, derivedParameters });
    const merged = merge({ ...sourceParameters, ...changedFacts }, pending.derivedParameters);
    expect(merged).toEqual(pending.parameters);
    expect(merged).toMatchObject({ impervious_sheet_area_m2: null, curing_worker_h: 7 });
    const changed = await compile(next, facts, { "material:concrete:impervious-curing-sheet": amendment("25.25") });
    expect(merge(sourceParameters, changed.derivedParameters)).toEqual(changed.parameters);
    const closedFacts = { ...facts, approved_external_curing_method: "WATER_CURING", impervious_sheet_area_m2: null,
      impervious_sheet_designation: null, curing_material_accessories_pricing_mode: null, curing_water_m3: 1, curing_water_source_reference: "DEMO on-site water", curing_water_delivery_mode: "ON_SITE_SUPPLY" };
    const closed = await compile(next, closedFacts);
    expect(merge({ ...sourceParameters, ...closedFacts }, closed.derivedParameters)).toEqual(closed.parameters);
  });
});
