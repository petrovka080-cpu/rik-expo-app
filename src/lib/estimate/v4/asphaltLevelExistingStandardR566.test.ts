import standardEvidence from "../../../../data/estimate-benchmarks/fixtures/asphalt-level-existing-standard-r566-parent.json";
import historicalEvidence from "../../../../data/estimate-benchmarks/fixtures/asphalt-level-r566-historical-recipe-evidence.json";
import { appendAsphaltLevelExistingStandardR566, asphaltLevelExistingStandardR566 as profile, type AsphaltLevelCapturedParentR566 } from "./asphaltLevelExistingStandardR566";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { canonicalApprovedBaselineRuntimeParameters } from "../backendPlatform/canonicalEstimateApprovedBaseline";

const parent = standardEvidence.capturedParent as unknown as AsphaltLevelCapturedParentR566;
const historical = historicalEvidence.capturedParent as unknown as AsphaltLevelCapturedParentR566;
const input = () => ({ capturedParent: structuredClone(parent), capturedParentSha256: standardEvidence.capturedParentSha256,
  recipeParent: structuredClone(historical), recipeParentSha256: historicalEvidence.capturedParentSha256 });
const id = (value: string) => profile.namespace + value;
const facts = { [profile.siteParameterId]: profile.siteRu,
  [id("area_m2")]: 100, [id("layer_thickness_mm")]: 100 };
const runtime = (definition: ReturnType<typeof appendAsphaltLevelExistingStandardR566>) => canonicalApprovedBaselineRuntimeParameters({
  input_values: { ...parent.baseline.input_values, ...facts, ...definition.runtimeProfileInput },
  input_classification: { ...parent.baseline.input_classification,
    ...Object.fromEntries(Object.keys(facts).map((parameter) => [parameter, "VALIDATION_FIXTURE"])), ...definition.runtimeProfileClassification },
});
const compile = (values: Record<string, unknown>, definition = appendAsphaltLevelExistingStandardR566(input()),
  rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", catalogId: profile.catalogId, compilerVersion: profile.contract, primaryMeasureParameterId: id("area_m2"),
  parameterDefinitions: definition.parameters as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
  formulaDefinitions: definition.formulas as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
  resourceDefinitions: definition.resources as CanonicalEstimateCompileCoreInput["resourceDefinitions"], submittedParameters: values,
  confirmedParameters: runtime(definition), rowOverrides, priceItems: [], currencyCode: "KGS", maximumResourceRows: 128, hashJson: estimateDeterministicHash,
});
const compileCaptured = (capture: AsphaltLevelCapturedParentR566, values: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", catalogId: capture.definition.catalog_id, compilerVersion: "TEST_ONLY_HISTORICAL_CAPTURE_REPLAY", primaryMeasureParameterId: "area_m2",
  parameterDefinitions: capture.parameters as CanonicalEstimateCompileCoreInput["parameterDefinitions"], formulaDefinitions: capture.formulas as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
  resourceDefinitions: capture.resources as CanonicalEstimateCompileCoreInput["resourceDefinitions"], submittedParameters: values, confirmedParameters: {}, rowOverrides,
  priceItems: [], currencyCode: "KGS", maximumResourceRows: 128, hashJson: estimateDeterministicHash,
});
it("retains all captured v9 physics and manual prices as immutable compatibility evidence without a new public legacy method", async () => {
  const originalBytes = JSON.stringify(parent), next = appendAsphaltLevelExistingStandardR566(input());
  expect(next.parameters).toHaveLength(51); expect(next.formulas).toHaveLength(48); expect(next.resources).toHaveLength(81);
  expect(next.formulas.slice(0, parent.formulas.length)).toEqual(parent.formulas);
  for (const old of parent.parameters) expect(next.parameters.find((parameter) => parameter.parameter_id === old.parameter_id)).toMatchObject({
    parameter_id: old.parameter_id, value_type: old.value_type, unit_id: old.unit_id, default_value: old.default_value,
    truth_metadata: { ...old.truth_metadata, visible_when: { kind: "literal", value: false } },
  });
  for (const old of parent.resources) {
    const retained = next.resources.find((row) => row.row_id === old.row_id)!;
    for (const key of ["id", "formula_id", "unit_id", "cost_owner_id", "procurement_eligible", "resource_graph", "source_metadata"])
      expect((retained as Record<string, unknown>)[key]).toEqual(old[key]);
  }
  const pricedRow = parent.resources.find((row) => row.unit_id === "t")!.row_id;
  const overrides = { [pricedRow]: { unitPrice: "100", provenance: { kind: "manual" as const, reason: "TEST_ONLY captured standard manual price retention" } } };
  const previous = await compileCaptured(parent, parent.baseline.input_values, overrides);
  expect(previous.preliminaryNeeds).toEqual([]); expect(previous.rows).toHaveLength(24);
  const expected = ["36", "14.805", "1", "148.05", "1", "120", "120", "14.805", "120", "120", "120", "120",
    "1.2", "1.2", "1.2", "1.2", "1.2", "1", "1", "1", "1", "1.2", "1", "1"];
  for (let ordinal = 1; ordinal <= expected.length; ordinal++)
    expect(previous.rows.find((row) => row.row_id.endsWith(":r555:" + ordinal))?.quantity).toBe(expected[ordinal - 1]);
  expect(previous.rows.find((row) => row.row_id === pricedRow)).toMatchObject({ quantity: "14.805", unit_price: "100", amount: "1480.5" });
  await expect(compile({ ...parent.baseline.input_values, [profile.methodParameterId]: profile.legacyMethodRu }, next, overrides))
    .rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  expect(JSON.stringify(parent)).toBe(originalBytes);
});

it("calculates source-owned thickness increments from four ordinary facts without leaking old geometry or inventing project schedules", async () => {
  const next = appendAsphaltLevelExistingStandardR566(input()), result = await compile(facts, next);
  expect(next.ordinaryParameterIds).toHaveLength(4);
  expect(next.parameters.find((parameter) => parameter.parameter_id === id("area_m2"))?.default_value).toBeNull();
  expect(result.parameters[id("area_m2")]).toBe(100); expect(result.parameters.area_m2).toBeUndefined();
  const quantity = (rowId: string) => result.rows.find((row) => row.row_id === id(rowId))?.quantity;
  expect(quantity("asphalt:control:geometric-compacted-volume")).toBe("10");
  expect(quantity("asphalt:material:hot-dense-fine-mix")).toBe("23.58");
  expect(quantity("asphalt:material:road-bitumen")).toBe("0.02");
  expect(quantity("asphalt:labor:road-workers")).toBe("7");
  expect(result.rows.every((row) => row.row_id.startsWith(profile.namespace))).toBe(true);
  const missing = new Set(result.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids));
  for (const parameter of next.projectFactParameterIds) expect(missing.has(parameter)).toBe(true);
  for (const parameter of next.normativeParameterIds) expect(missing.has(parameter)).toBe(false);
  expect(result.parameters[id("haul_distance_km")]).toBeUndefined(); expect(result.parameters[id("acceptance_lot_m2")]).toBeUndefined();
  for (const parameter of next.assumedProfileParameterIds) expect(next.parameters.find((value) => value.parameter_id === parameter)?.truth_metadata?.runtime_profile_classification).toBe("ASSUMPTION");
});

it("replays all 57 captured recipe quantities and payment owners only after the project facts are supplied explicitly", async () => {
  const next = appendAsphaltLevelExistingStandardR566(input());
  const project = Object.fromEntries(Object.entries(historical.baseline.input_values).filter(([parameter]) =>
    !Object.hasOwn(profile.normativeConstants, parameter) && !Object.hasOwn(profile.selectedPreliminaryProfile.declaredValues, parameter)).map(([parameter, value]) => [id(parameter), value]));
  const previous = await compileCaptured(historical, historical.baseline.input_values);
  const result = await compile({ ...facts, ...project }, next);
  expect(result.preliminaryNeeds).toEqual([]); expect(result.rows).toHaveLength(57);
  expect(result.rows.map((row) => [row.row_id, row.quantity, row.unit_id, row.included_in_estimate, row.included_in_procurement]))
    .toEqual(previous.rows.map((row) => [id(row.row_id), row.quantity, row.unit_id, row.included_in_estimate, row.included_in_procurement]));
  for (const old of historical.resources) {
    const transferred = next.resources.find((row) => row.row_id === id(old.row_id))!;
    expect(transferred.unit_id).toBe(old.unit_id); expect(transferred.resource_graph?.costTreatment).toBe(old.resource_graph.costTreatment);
    expect(transferred.cost_owner_id).toBe(old.cost_owner_id == null ? null : id(old.cost_owner_id));
  }
  expect(next.newlySourceBoundRowIds).toEqual([id(profile.historicalBindingEvidence.resourceRowId)]);
});

it.each([id("area_m2"), id("layer_thickness_mm"), profile.siteParameterId])("keeps missing ordinary fact %s unresolved", async (parameter) => {
  const values: Record<string, unknown> = { ...facts }; delete values[parameter]; const result = await compile(values);
  expect(result.preliminaryNeeds.some((need) => need.missing_parameter_ids.includes(parameter))).toBe(true);
  expect(result.rows.some((row) => row.row_id.startsWith("work_catalog_"))).toBe(false);
});

it.each([29, 32, 205])("rejects unsupported measured thickness %s without an area-based method switch", async (thickness) => {
  await expect(compile({ ...facts, [id("layer_thickness_mm")]: thickness })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
});
it("locks all 18 source constants and preserves an independently priced measured row on recalculation", async () => {
  const next = appendAsphaltLevelExistingStandardR566(input()); expect(next.normativeParameterIds).toHaveLength(18);
  for (const parameter of next.normativeParameterIds) {
    const definition = next.parameters.find((value) => value.parameter_id === parameter)!;
    const exactSourceBound = definition.constraints_json?.min === definition.constraints_json?.max;
    await expect(compile({ ...facts, [parameter]: 999 }, next)).rejects.toMatchObject({
      code: exactSourceBound ? "PARAMETER_VALIDATION_FAILED" : "SOURCE_MANAGED_PARAMETER_OVERRIDE_NOT_ALLOWED",
    });
  }
  const mix = id("asphalt:material:hot-dense-fine-mix"), prices = { [mix]: { unitPrice: "77", provenance: { kind: "manual" as const, reason: "TEST_ONLY measured method price" } } };
  const result = await compile({ ...facts, [id("area_m2")]: 200 }, next, prices);
  expect(result.rows.find((row) => row.row_id === mix)).toMatchObject({ quantity: "47.16", unit_price: "77", amount: "3631.32" });
  expect(result.rows.filter((row) => row.row_id !== mix && row.included_in_estimate).every((row) => row.unit_price === null)).toBe(true);
});
it("refuses incompatible site conditions, capture mutation and unselected numeric constants", async () => {
  await expect(compile({ ...facts, [profile.siteParameterId]: "Основание не принято" })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  const changed = input(); changed.recipeParent.formulas[0]!.expression_source = "1";
  expect(() => appendAsphaltLevelExistingStandardR566(changed)).toThrow("FULL_PARENT_SEMANTIC_PIN");
  expect(profile.catalogId).toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_level_standard");
  expect(profile.publication.newCatalogIds).toBe(0); expect(profile.publication.registryWrites).toBe(false);
});

it("gets the protected physical method from the real approved-baseline filter while fresh measurements remain absent", () => {
  const next = appendAsphaltLevelExistingStandardR566(input()), approved = runtime(next);
  expect(next.primaryMeasureParameterId).toBe(id("area_m2"));
  expect(next).not.toHaveProperty("primaryMeasureSelectionV1");
  expect(approved[profile.methodParameterId]).toBe(profile.methodRu);
  expect(approved).not.toHaveProperty("area_m2");
  for (const parameter of next.ordinaryParameterIds) expect(approved).not.toHaveProperty(parameter);
  expect(next.parameters.find((parameter) => parameter.parameter_id === profile.methodParameterId)).toMatchObject({
    constraints_json: { values: [profile.methodRu] }, truth_metadata: {
      visibility_role: "INTERNAL_ONLY", visible_when: { kind: "literal", value: false },
      runtime_profile_classification: "RUNTIME_STRUCTURAL_DEFAULT",
      provenance: { physicalMethodFixedByPublicWork: true, historicalOracleValueIsNotAPublicOption: true },
    },
  });
  expect(facts).not.toHaveProperty(profile.methodParameterId);
});
