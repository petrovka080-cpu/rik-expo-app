import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { canonicalApprovedBaselineRuntimeParameters } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateResourceDefinition } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { assertCanonicalPurchaseReadinessV1 } from "../../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const CATALOG = "canonical-work:base:heating_hvac_interior_heating_pipe_install_standard";
const PREFIX = "hvac-hep2o22:";
const OUTPUT = resolve(".release-runtime/r568/s27-31/wavin-accepted-order-current/independent-acceptance.json");
const SOURCE = resolve("data/estimate-benchmarks/source-packs/hvac-wavin-hep2o22-heating-standard-s27-23.json");
const OWNERS = ["02:material:pipe-bundles", "02:consumable:cutter-blades", "03:fastener:support-packages", "03:fastener:anchor-packages",
  "03:fastener:screw-packages", "03:consumable:drill-bits", "04:component:smartsleeves", "04:consumable:wipe-packages",
  "05:component:straight-connectors", "05:component:elbows", "05:component:tees", "05:component:threaded-adapters",
  "05:component:stop-ends", "05:consumable:ptfe", "08:consumable:waste-bags"].map(id => PREFIX + id);
const FLUIDS = [
  { row: "07:material:test-water", formula: "hvac_wavin_hep2o22_test_water_s2723", unit: "m3", consumed: "0.024605739", partial: "0.02", gap: "0.004605739", positive: "0.03", excess: "0.005394261" },
  { row: "07:material:fill-water", formula: "hvac_wavin_hep2o22_fill_water_s2723", unit: "m3", consumed: "0.024605739", partial: "0.02", gap: "0.004605739", positive: "0.03", excess: "0.005394261" },
  { row: "07:material:inhibitor", formula: "hvac_wavin_hep2o22_inhibitor_s2723", unit: "l", consumed: "0.24605739", partial: "0.2", gap: "0.04605739", positive: "0.3", excess: "0.05394261" },
] as const;
const BINDINGS = [ { owner: "02:material:pipe-bundles", alias: "wavin_effective_pipe_bundles" },
  { owner: "03:fastener:support-packages", alias: "wavin_effective_support_packages" } ] as const;
const CONTROLS = [
  { row: "02:control:ordered-sections", alias: BINDINGS[0].alias, unit: "item" },
  { row: "02:control:ordered-length", alias: BINDINGS[0].alias, unit: "m" },
  { row: "02:control:available-before-losses", alias: BINDINGS[0].alias, unit: "m" },
  { row: "02:control:pipe-remainder", alias: BINDINGS[0].alias, unit: "m" },
  { row: "03:control:support-order", alias: BINDINGS[1].alias, unit: "item" },
  { row: "03:control:support-remainder", alias: BINDINGS[1].alias, unit: "item" },
] as const;
const TITLES = [ { row: BINDINGS[0].owner, parameter: "pipe_bundle_item", type: "integer", changed: "10" },
  { row: "02:control:required-sections", parameter: "pipe_section_length_m", type: "decimal", changed: "3" },
  { row: BINDINGS[1].owner, parameter: "support_package_item", type: "integer", changed: "125" } ] as const;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const sameIds = (actual: readonly string[], expected: unknown) => Array.isArray(expected) && expected.length === actual.length
  && new Set(expected).size === actual.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
async function main() {
  const uri = new URL(process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2");
  invariant(uri.hostname === "127.0.0.1" && uri.port === "55432" && uri.pathname === "/rik_r4_runtime_b5_v2", "STOP_WAVIN_LOCAL_DB_ONLY");
  const current = JSON.parse(readFileSync("data/estimate-benchmarks/r568-local-developer-canonical-release.json", "utf8"));
  const db = new Client({ connectionString: uri.toString() }); await db.connect();
  try {
    await db.query("begin transaction read only");
    const release = (await db.query("select id::text,status,activated_at from public.estimate_definition_release where id=$1", [current.definitionReleaseId])).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null, "STOP_WAVIN_PREPARED_ONLY");
    const target = (await db.query(`select m.definition_version_id::text,m.approved_template_baseline_id::text from public.estimate_cumulative_manifest_entry m
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG])).rows[0];
    invariant(target?.approved_template_baseline_id, "STOP_WAVIN_BASELINE_MISSING");
    const parameters = (await db.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateParameterDefinition[];
    const formulas = (await db.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await db.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await db.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0];
    const search = (await db.query(`select d.definition_version_id::text,d.selectable,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG])).rows[0];
    invariant(search?.status === "draft" && search.selectable === true && search.definition_version_id === target.definition_version_id, "STOP_WAVIN_SEARCH_JOIN");
    const locator = (await db.query(`select l.locator from public.estimate_work_normative_binding b join public.estimate_normative_locator l on l.id=b.locator_id
      where b.definition_version_id=$1 and l.locator_key=$2`, [target.definition_version_id, "hvac-wavin-hep2o22-accepted-order-s27-31"])).rows[0]?.locator as Json;
    invariant(locator?.sourcePackSha256 === sha(readFileSync(SOURCE)) && parameters.length === 45 && formulas.length === 49 && resources.length === 69
      && sameIds(resources.map(row => row.row_id), locator.expectedResourceIds) && sameIds(formulas.map(row => row.formula_id), locator.expectedFormulaIds)
      && sameIds(OWNERS, locator.selectedSupplyOwnerIds) && sameIds(FLUIDS.map(value => PREFIX + value.row), locator.continuousFluidSupplyOwnerIds)
      && sameIds(CONTROLS.map(value => PREFIX + value.row), locator.effectiveControlRowIds), "STOP_WAVIN_EXACT_MATRIX_SOURCE_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0, "STOP_WAVIN_FORMULA_DRIFT");
    const byFormula = new Map(formulas.map(formula => [formula.formula_id, formula]));
    const geometry = resources.find(row => row.row_id === PREFIX + "02:control:pipe-inside-diameter")!;
    const bounds = (geometry?.resource_graph as Json)?.formulaOutputBoundsV1;
    invariant(geometry?.unit_id === "mm" && geometry.formula_id === "hvac_wavin_hep2o22_pipe_inside_diameter_s2723"
      && byFormula.get(geometry.formula_id)?.expression_source === "pipe_outer_diameter_mm-2*pipe_wall_thickness_mm"
      && (geometry.inclusion_ast as Json).kind === "literal" && (geometry.inclusion_ast as Json).value === true
      && (geometry.resource_graph as Json).costTreatment === "INFORMATIONAL_SCOPE"
      && bounds?.schemaVersion === "canonical_formula_output_bounds_v1" && bounds.unitId === "mm" && bounds.exclusiveMinimum === 0
      && geometry.ordinal < resources.find(row => row.row_id === PREFIX + "02:control:system-volume")!.ordinal,
    "STOP_WAVIN_ALWAYS_POSITIVE_GEOMETRY_GUARD");
    const declared = new Set(parameters.map(parameter => parameter.parameter_id));
    for (const resource of resources) {
      const graph = resource.resource_graph as Json, formula = byFormula.get(resource.formula_id);
      invariant(formula && graph.formulaId === resource.formula_id && formula.output_unit_id === resource.unit_id && graph.normalizedUom === resource.unit_id
        && formula.input_parameter_ids.every(id => declared.has(id)), "STOP_WAVIN_RESOURCE_FORMULA_BINDING:" + resource.row_id);
    }
    invariant(sameIds(resources.filter(row => (row.resource_graph as Json).purchaseBalanceV1).map(row => row.row_id), [...OWNERS, ...FLUIDS.map(value => PREFIX + value.row)]), "STOP_WAVIN_18_BALANCE_OWNERS");
    const pipePlanned = "ceil(ceil((route_length_m+route_length_m*pipe_expected_waste_percent/100)/pipe_section_length_m)/pipe_bundle_item)";
    for (const id of OWNERS) {
      const owner = resources.find(row => row.row_id === id)!, policy = (owner.resource_graph as Json).purchaseBalanceV1;
      invariant(policy?.quantityMode === "supply_quantum" && policy.balanceScope === "new_order_vs_required_consumption"
        && policy.requirementBasis === "selected_supply_order" && policy.unitId === "item" && policy.orderQuantumExpression === "1"
        && policy.stockExpression === "0" && policy.reserveExpression === "0" && policy.consumedExpression === byFormula.get(owner.formula_id)?.expression_source
        && policy.plannedConsumptionExpression === (id === PREFIX + BINDINGS[0].owner ? pipePlanned : policy.consumedExpression), "STOP_WAVIN_WHOLE_POLICY:" + id);
    }
    for (const binding of FLUIDS) {
      const owner = resources.find(row => row.row_id === PREFIX + binding.row)!, policy = (owner.resource_graph as Json).purchaseBalanceV1;
      invariant(owner?.unit_id === binding.unit && owner.formula_id === binding.formula && policy.quantityMode === "canonical_decimal"
        && policy.unitId === binding.unit && policy.balanceScope === "new_order_vs_required_consumption" && policy.stockExpression === "0" && policy.reserveExpression === "0"
        && policy.consumedExpression === byFormula.get(owner.formula_id)?.expression_source
        && !Object.hasOwn(policy, "orderQuantumExpression") && !Object.hasOwn(policy, "requirementBasis") && !Object.hasOwn(policy, "plannedConsumptionExpression"), "STOP_WAVIN_FLUID_POLICY");
    }
    invariant(sameIds(parameters.filter(parameter => (parameter.truth_metadata as Json)?.effective_resource_quantity_v1).map(parameter => parameter.parameter_id), BINDINGS.map(value => value.alias))
      && sameIds(resources.filter(row => (row.resource_graph as Json).effectiveQuantityOutputV1).map(row => row.row_id), BINDINGS.map(value => PREFIX + value.owner)), "STOP_WAVIN_EXACT_ALIASES");
    for (const binding of BINDINGS) {
      const alias = parameters.find(parameter => parameter.parameter_id === binding.alias)!, owner = resources.find(row => row.row_id === PREFIX + binding.owner)!;
      invariant(alias?.value_type === "decimal" && (alias as Json).unit_id === "item" && alias.required === false && alias.default_value == null
        && (alias.truth_metadata as Json).visibility_role === "INTERNAL_ONLY"
        && (alias.truth_metadata as Json).effective_resource_quantity_v1.sourceRowId === PREFIX + binding.owner
        && (alias.truth_metadata as Json).effective_resource_quantity_v1.unitId === "item"
        && (owner.resource_graph as Json).effectiveQuantityOutputV1.parameterId === binding.alias
        && (owner.resource_graph as Json).effectiveQuantityOutputV1.unitId === "item", "STOP_WAVIN_ALIAS_BINDING");
    }
    for (const binding of CONTROLS) {
      const resource = resources.find(row => row.row_id === PREFIX + binding.row)!, formula = byFormula.get(resource.formula_id)!;
      invariant(resource.unit_id === binding.unit && formula.output_unit_id === binding.unit
        && sameIds(formula.input_parameter_ids.filter(id => BINDINGS.some(value => value.alias === id)), [binding.alias]), "STOP_WAVIN_CONTROL_DEPENDENCY");
    }
    invariant(sameIds(resources.filter(row => (row.resource_graph as Json).titleSpecificationParameterIds).map(row => row.row_id), TITLES.map(value => PREFIX + value.row)), "STOP_WAVIN_EXACT_TITLE_OWNERS");
    for (const binding of TITLES) {
      const resource = resources.find(row => row.row_id === PREFIX + binding.row)!, parameter = parameters.find(row => row.parameter_id === binding.parameter)!;
      invariant(sameIds((resource.resource_graph as Json).titleSpecificationParameterIds, [binding.parameter]) && (resource.resource_graph as Json).titleSpecificationMode === "APPEND"
        && parameter.value_type === binding.type, "STOP_WAVIN_TYPED_TITLE_BINDING");
    }
    const fixture = { route_length_m: 100, support_count: 201, prepared_pipe_end_count: 40, straight_connector_count: 14, elbow_count: 4, tee_count: 1, threaded_adapter_count: 1, stop_end_count: 0 };
    const run = (submitted: Record<string, unknown> = fixture, rowOverrides: Record<string, Record<string, unknown>> = {}) => compileCanonicalEstimateCore({ operation: Object.keys(rowOverrides).length ? "recalculate" : "compile",
      compilerVersion: "s27-31-wavin-independent-db-readback", catalogId: CATALOG, primaryMeasureParameterId: "route_length_m",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources, submittedParameters: submitted,
      confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline), rowOverrides, priceItems: [], currencyCode: "KGS", maximumResourceRows: 69, hashJson: async value => sha(JSON.stringify(value)) });
    const override = (id: string, quantity: string) => ({ [PREFIX + id]: { quantity, includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE independent accepted supply" } } });
    const original = await run();
    invariant(original.rows.length === 69 && original.preliminaryNeeds.length === 0, "STOP_WAVIN_COMPOSITION");
    const q = (result: typeof original, id: string) => result.rows.find(row => row.row_id === PREFIX + id)!;
    const readiness = (result: typeof original) => { let code: unknown; try { assertCanonicalPurchaseReadinessV1(result.rows); } catch (error) { code = (error as Json).code; } return code ?? null; };
    invariant(q(original, "02:control:pipe-inside-diameter").quantity === "17.7", "STOP_WAVIN_VALID_GEOMETRY");
    const geometryControls = [];
    for (const outer of [4, 6]) for (const manual of [false, true]) {
      let code: unknown;
      try { await run({ ...fixture, pipe_outer_diameter_mm: outer, pipe_wall_thickness_mm: 3 }, manual ? {
        [geometry.row_id]: { quantity: "17.7", includedInEstimate: false, includedInProcurement: false,
          provenance: { kind: "manual", reason: "VALIDATION_FIXTURE invalid geometry cannot be repaired by row edits" } },
        ...override("07:material:test-water", "0"),
      } : {}); } catch (error) { code = (error as Json).code; }
      invariant(code === "FORMULA_OUTPUT_BOUNDS_FAILED", "STOP_WAVIN_GEOMETRY_MANUAL_BYPASS");
      geometryControls.push({ outer, wall: 3, manual, rejectedCode: code });
    }
    const missing = await run({ ...fixture, pipe_wall_thickness_mm: null }, override("02:control:pipe-inside-diameter", "17.7"));
    const missingGeometry = missing.preliminaryNeeds.find(need => need.row_id === geometry.row_id);
    invariant(missingGeometry?.quantity === "17.7" && missingGeometry.need_state === "QUANTITY_REQUIRED"
      && sameIds(missingGeometry.missing_parameter_ids, ["pipe_wall_thickness_mm"]), "STOP_WAVIN_MISSING_GEOMETRY_LOCAL_NEED");
    const alternateGeometry = await run({ ...fixture, pipe_outer_diameter_mm: 8, pipe_wall_thickness_mm: 3 });
    invariant(q(alternateGeometry, "02:control:pipe-inside-diameter").quantity === "2", "STOP_WAVIN_POSITIVE_TEST_GEOMETRY");
    const controls = [];
    for (const [pipe, support, route, expected, blocked] of [
      ["1", "3", 100, ["20", "120", "20", "15", "300", "99"], false],
      ["2", "4", 100, ["40", "240", "140", "135", "400", "199"], false],
      ["0", "2", 100, ["0", "0", "0", "0", "200", "0"], true],
      ["1", "3", 110, ["20", "120", "10", "4.5", "300", "99"], true],
      ["2", "3", 110, ["40", "240", "130", "124.5", "300", "99"], false],
    ] as const) {
      const input = { ...fixture, route_length_m: route }, physical = await run(input);
      const result = await run(input, { ...override(BINDINGS[0].owner, pipe), ...override(BINDINGS[1].owner, support) });
      invariant(result.rows.length === 69 && result.preliminaryNeeds.length === 0, "STOP_WAVIN_CONTROL_COMPOSITION");
      CONTROLS.forEach((binding, index) => invariant(q(result, binding.row).quantity === expected[index], "STOP_WAVIN_ACCEPTED_CONTROL:" + binding.row));
      const changed = [...BINDINGS.map(value => PREFIX + value.owner), ...CONTROLS.map(value => PREFIX + value.row)];
      for (const row of physical.rows.filter(row => !changed.includes(row.row_id))) invariant(result.rows.find(value => value.row_id === row.row_id)?.quantity === row.quantity, "STOP_WAVIN_PHYSICAL_CHANGE:" + row.row_id);
      const balance = (q(result, BINDINGS[0].owner).calculation_trace as Json).purchaseBalance;
      invariant(balance.plannedConsumption === "1" && balance.requiredSelectedOrder === (route === 110 ? "2" : "1")
        && balance.requirementBasis === "selected_supply_order" && balance.consumptionShortage === (pipe === "0" || (route === 110 && pipe === "1") ? "1" : "0")
        && readiness(result) === (blocked ? "PROCUREMENT_MATERIAL_SHORTAGE" : null), "STOP_WAVIN_RETAINED_RESERVE_READINESS");
      controls.push({ pipe, support, route, expected, blocked, planned: balance.plannedConsumption, required: balance.requiredSelectedOrder,
        retainedReserveM: q(result, "02:material:pipe-reserve").quantity, afterExpectedLossesM: q(result, "02:control:pipe-remainder").quantity, physicalUnchanged: true });
    }
    const fluidControls = [];
    for (const fluid of FLUIDS) for (const [accepted, shortage, excess] of [["0", fluid.consumed, "0"], [fluid.partial, fluid.gap, "0"], [fluid.positive, "0", fluid.excess]]) {
      const result = await run(fixture, override(fluid.row, accepted)), owner = q(result, fluid.row), balance = (owner.calculation_trace as Json).purchaseBalance;
      invariant(balance.consumed === fluid.consumed && balance.consumptionShortage === shortage && balance.excessOrderAboveRequiredConsumption === excess
        && owner.included_in_procurement === (shortage === "0") && readiness(result) === (shortage === "0" ? null : "PROCUREMENT_MATERIAL_SHORTAGE"), "STOP_WAVIN_FLUID_READINESS");
      for (const row of original.rows.filter(row => row.row_id !== PREFIX + fluid.row)) invariant(result.rows.find(value => value.row_id === row.row_id)?.quantity === row.quantity, "STOP_WAVIN_FLUID_PHYSICAL_CHANGE");
      fluidControls.push({ rowId: PREFIX + fluid.row, accepted, shortage, excess, physicalUnchanged: true });
    }
    for (const quantity of ["1.5", "1.0000000001"]) {
      let code: unknown; try { await run(fixture, override(BINDINGS[0].owner, quantity)); } catch (error) { code = (error as Json).code; }
      invariant(code === "ROW_AMENDMENT_INVALID", "STOP_WAVIN_RAW_WHOLE_SUPPLY_GUARD");
    }
    const alternate = await run({ ...fixture, pipe_bundle_item: 10, pipe_section_length_m: 3, support_package_item: 125 });
    for (const binding of TITLES) { const title = q(alternate, binding.row).title_ru;
      invariant(typeof title === "string" && title.endsWith(binding.changed), "STOP_WAVIN_ACTUAL_TITLE_SPECIFICATION"); }
    for (const [id, expected] of [[BINDINGS[0].owner, "4"], ["02:control:required-sections", "37"], ["02:control:ordered-sections", "40"],
      ["02:control:ordered-length", "120"], [BINDINGS[1].owner, "2"], ["03:control:support-order", "250"], ["03:control:support-remainder", "49"]]) invariant(q(alternate, id).quantity === expected, "STOP_WAVIN_ALTERNATE_DECLARED_PACKAGING");
    await db.query("rollback");
    mkdirSync(dirname(OUTPUT), { recursive: true });
    const receipt = { status: "GREEN_INDEPENDENT_WAVIN_ACCEPTED_ORDER_DB_READBACK", capturedAt: new Date().toISOString(), current, target, release, search,
      sourcePackSha256: sha(readFileSync(SOURCE)), wholeOwners: OWNERS, fluidOwners: FLUIDS.map(value => PREFIX + value.row), bindings: BINDINGS, controls, fluidControls, geometryControls,
      alternateClassification: "VALIDATION_FIXTURE_DECLARATION_NOT_MANUFACTURER_OR_PROJECT_APPROVAL", alternateTypedTitlesAndQuantitiesVerified: true,
      apiWriterAcceptance: false, nativeAcceptance: false, ordinaryConsumerAcceptance: false, projectOrEngineeringApproval: false, productionActivated: false };
    writeFileSync(OUTPUT, JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ status: receipt.status, current, target, whole: OWNERS.length, fluids: FLUIDS.length, aliases: BINDINGS.length, controls: CONTROLS.length, output: OUTPUT }));
  } finally { await db.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
