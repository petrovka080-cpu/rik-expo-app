import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { canonicalApprovedBaselineRuntimeParameters } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateResourceDefinition } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { assertCanonicalPurchaseReadinessV1 } from "../../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { compareFormulaGraphDecimals } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
type Owner = Readonly<{ rowId: string; formulaId: string; unitId: string; expression: string }>;
const OUTPUT = resolve(process.env.R4A13_READBACK_OUTPUT
  ?? ".release-runtime/r568/s27-31/ancillary-material-orders-current/independent-acceptance.json");
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const equal = (actual: string, expected: string) => compareFormulaGraphDecimals(actual, expected) === 0;
const exactIds = (actual: string[], expected: unknown): boolean => Array.isArray(expected)
  && actual.length === expected.length && new Set(actual).size === actual.length
  && new Set(expected).size === expected.length && actual.every(id => expected.includes(id));

// Independent literal identities and original requirement formulas, not imports from the writer.
function asphaltOwners(course?: "binder" | "wearing"): Owner[] {
  const prefix = course ? `bridge:${course}:asphalt` : "asphalt";
  const formulaPrefix = course ? `bridge_${course}_` : "";
  const thickness = course ? `${course}_layer_thickness_mm` : "layer_thickness_mm";
  return [
    { rowId: `${prefix}:material:road-bitumen`, formulaId: `${formulaPrefix}asphalt_install_road_bitumen_v1`, unitId: "t",
      expression: `area_m2/1000*(road_bitumen_base_t_per_1000m2+((${thickness}-krer_base_thickness_mm)/krer_increment_thickness_mm)*road_bitumen_increment_t_per_1000m2)` },
    { rowId: `${prefix}:material:technical-kerosene`, formulaId: `${formulaPrefix}asphalt_install_technical_kerosene_v1`, unitId: "t",
      expression: "area_m2/1000*technical_kerosene_t_per_1000m2" },
    { rowId: `${prefix}:material:hardwood-side-stop-bars`, formulaId: `${formulaPrefix}asphalt_install_hardwood_bars_v1`, unitId: "m3",
      expression: "area_m2/1000*hardwood_bars_m3_per_1000m2" },
  ];
}
function concreteOwners(prefix: "strip-pour" | "anchor-group-pour" | "bridge:screed"): Owner[] {
  const bridge = prefix === "bridge:screed";
  return [
    { rowId: `${prefix}:material:curing-sheet`, formulaId: `${bridge ? "bridge_screed_" : ""}strip_pour_curing_sheet_v1`, unitId: "m2",
      expression: bridge ? "area_m2*bridge_screed_curing_sheet_overlap_factor"
        : "plan_dimension_concrete_volume_m3*exposed_curing_surface_ratio_m2_m3*curing_sheet_overlap_factor" },
    { rowId: `${prefix}:joint:waterstop`, formulaId: `${bridge ? "bridge_screed_" : ""}strip_pour_joint_length_v1`, unitId: "m",
      expression: `${bridge ? "bridge_screed_" : ""}construction_joint_waterstop_length_m` },
  ];
}
const concreteFacts = { construction_joint_mode: "WATERSTOP", construction_joint_waterstop_length_m: 18,
  construction_joint_waterstop_specification: "VALIDATION_FIXTURE: ПВХ по испытательному узлу КЖ-17; не проектное подтверждение" };
const TARGETS = [
  { catalogId: "canonical-work:base:paving_roads_landscape_interior_asphalt_lay_standard", primary: "area_m2",
    locatorKey: "asphalt-upper-course-krer-27-06-020-01-021-01-s27-31-accepted-order-ancillary-orders-s27-31", owners: asphaltOwners(),
    submitted: { area_m2: 5000, layer_thickness_mm: 50 }, sourcePack: "asphalt-install-large-area-krer27-profile-r1.json",
    sourceSha: "4d861329b43bb096533f97d9d75d3a745acc161b009a92dee31ee046d3fdbcd0" },
  { catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_large_area", primary: "plan_dimension_concrete_volume_m3",
    locatorKey: "strip-foundation-concrete-accepted-order-s27-31-ancillary-orders-s27-31", owners: concreteOwners("strip-pour"),
    submitted: { plan_dimension_concrete_volume_m3: 240, ...concreteFacts }, sourcePack: "strip-foundation-concrete-placement-preliminary-profile-r1.json",
    sourceSha: "48b74862d1cff07636658b28abe48f4e6acf74e592489914fda4162d191d14f2" },
  { catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load", primary: "plan_dimension_concrete_volume_m3",
    locatorKey: "anchor-group-concrete-placement-high-load-preliminary-profile-r2-ancillary-orders-s27-31", owners: concreteOwners("anchor-group-pour"),
    submitted: { plan_dimension_concrete_volume_m3: 20, ...concreteFacts }, sourcePack: "strip-foundation-concrete-placement-preliminary-profile-r1.json",
    sourceSha: "48b74862d1cff07636658b28abe48f4e6acf74e592489914fda4162d191d14f2" },
  { catalogId: "canonical-work:expanded:bridge_asphalt", primary: "area_m2", locatorKey: "bridge-asphalt-complete-preliminary-profile-r5-ancillary-orders-s27-31",
    owners: [...asphaltOwners("binder"), ...asphaltOwners("wearing"), ...concreteOwners("bridge:screed")],
    submitted: { area_m2: 4800, bridge_length_m: 150, bridge_width_m: 32, bridge_screed_construction_joint_mode: "WATERSTOP",
      bridge_screed_construction_joint_waterstop_length_m: 18, bridge_screed_construction_joint_waterstop_specification: concreteFacts.construction_joint_waterstop_specification },
    sourcePack: "bridge-asphalt-complete-preliminary-profile-r1.json", sourceSha: "72564c2650c0ef3df7523e302f23165d6737718b9ed908fb8bffab886c78495d" },
] as const;

async function main() {
  const uri = new URL(process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2");
  invariant(uri.hostname === "127.0.0.1" && uri.port === "55432" && uri.pathname === "/rik_r4_runtime_b5_v2", "STOP_ANCILLARY_DB_IDENTITY");
  const current = JSON.parse(readFileSync(resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"), "utf8")) as Json;
  const client = new Client({ connectionString: uri.toString() });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const identity = (await client.query("select current_database() database,inet_server_port() port,current_setting('transaction_read_only') read_only")).rows[0];
    const release = (await client.query("select id::text,status,activated_at,source_manifest_sha256 from public.estimate_definition_release where id=$1", [current.definitionReleaseId])).rows[0];
    invariant(identity.read_only === "on" && release?.status === "prepared" && release.activated_at == null, "STOP_ANCILLARY_PREPARED_RELEASE");
    const observations = [];
    for (const selection of TARGETS) {
      const target = (await client.query(`select m.definition_version_id::text,m.runtime_publication_state,m.approved_template_baseline_id::text,
        d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count from public.estimate_cumulative_manifest_entry m
        join public.estimate_definition_version d on d.id=m.definition_version_id join public.estimate_content_passport_r3 p on p.definition_version_id=m.definition_version_id
        where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, selection.catalogId])).rows[0] as Json;
      invariant(target?.runtime_publication_state === "CANDIDATE" && target.content_status === "CANDIDATE_READY"
        && target.content_gate_status === "GREEN" && target.approved_template_baseline_id, "STOP_ANCILLARY_TARGET_GATE");
      const parameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateParameterDefinition[];
      const formulas = (await client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as CanonicalEstimateFormulaDefinition[];
      const resources = (await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateResourceDefinition[];
      const baseline = (await client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0];
      const search = (await client.query(`select d.definition_version_id::text,d.selectable,r.status from public.estimate_search_document d
        join public.estimate_search_index_release r on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, selection.catalogId])).rows[0];
      invariant(search?.status === "draft" && search.selectable === true && search.definition_version_id === target.definition_version_id, "STOP_ANCILLARY_SEARCH_JOIN");
      const locator = (await client.query(`select l.locator from public.estimate_work_normative_binding b join public.estimate_normative_locator l on l.id=b.locator_id
        where b.definition_version_id=$1 and l.locator_key=$2`, [target.definition_version_id, selection.locatorKey])).rows[0]?.locator as Json;
      invariant(sha(readFileSync(resolve("data/estimate-benchmarks/source-packs", selection.sourcePack))) === selection.sourceSha
        && locator?.sourcePackSha256 === selection.sourceSha, "STOP_ANCILLARY_SOURCE_JOIN");
      invariant(exactIds(selection.owners.map(owner => owner.rowId), locator.ancillaryOrderRowIds)
        && exactIds(resources.map(row => row.row_id), locator.expectedResourceIds)
        && exactIds(formulas.map(row => row.formula_id), locator.expectedFormulaIds)
        && parameters.length === Number(target.parameter_count) && formulas.length === Number(target.formula_count)
        && resources.length === Number(target.resource_count), "STOP_ANCILLARY_EXACT_MATRIX");
      invariant(validateMasterFormulaGraphConsistency(formulas).length === 0, "STOP_ANCILLARY_FORMULA_DRIFT");
      const parameterIds = new Set(parameters.map(parameter => parameter.parameter_id));
      for (const owner of selection.owners) {
        const resource = resources.find(row => row.row_id === owner.rowId);
        const formula = formulas.find(row => row.formula_id === owner.formulaId);
        const graph = resource?.resource_graph as Json | undefined;
        invariant(resource?.unit_id === owner.unitId && resource.formula_id === owner.formulaId && graph?.formulaId === owner.formulaId
          && graph.normalizedUom === owner.unitId && formula?.output_unit_id === owner.unitId && formula.expression_source === owner.expression
          && formula.input_parameter_ids?.every(id => parameterIds.has(id)), `STOP_ANCILLARY_LITERAL_BINDING:${owner.rowId}`);
        const policy = graph.purchaseBalanceV1;
        invariant(policy?.quantityMode === "canonical_decimal" && policy.balanceScope === "new_order_vs_required_consumption"
          && policy.unitId === owner.unitId && policy.consumedExpression === owner.expression && policy.stockExpression === "0"
          && policy.reserveExpression === "0" && policy.orderQuantumExpression == null && policy.plannedConsumptionExpression == null
          && policy.requirementBasis == null && graph.effectiveQuantityOutputV1 == null, `STOP_ANCILLARY_POLICY:${owner.rowId}`);
      }
      const run = (rowOverrides: Json = {}, extraParameters: Json = {}) => compileCanonicalEstimateCore({
        operation: Object.keys(rowOverrides).length ? "recalculate" : "compile", compilerVersion: "s27-31-ancillary-material-independent-db-readback",
        catalogId: selection.catalogId, primaryMeasureParameterId: selection.primary, parameterDefinitions: parameters, formulaDefinitions: formulas,
        resourceDefinitions: resources, submittedParameters: { ...selection.submitted, ...extraParameters }, confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline),
        rowOverrides, priceItems: [], currencyCode: "KGS", maximumResourceRows: resources.length, hashJson: async value => sha(JSON.stringify(value)) });
      const original = await run();
      invariant(original.preliminaryNeeds.length === 0, "STOP_ANCILLARY_BASELINE_NEEDS");
      const controls = [];
      for (const amount of ["0", "0.01", "10000"]) {
        const result = await run(Object.fromEntries(selection.owners.map(owner => [owner.rowId, { quantity: amount, includedInProcurement: true,
          provenance: { kind: "manual", reason: "VALIDATION_FIXTURE independent ancillary supply; not project approval" } }])));
        invariant(result.preliminaryNeeds.length === 0 && result.rows.length === original.rows.length, "STOP_ANCILLARY_CHANGED_SCOPE");
        const balances = selection.owners.map(owner => {
          const before = original.rows.find(row => row.row_id === owner.rowId)!;
          const after = result.rows.find(row => row.row_id === owner.rowId)!;
          const balance = (after.calculation_trace as Json).purchaseBalance as Json;
          const ready = compareFormulaGraphDecimals(amount, before.quantity) >= 0;
          invariant(compareFormulaGraphDecimals(before.quantity, "0.01") > 0 && equal(after.quantity, amount)
            && balance.consumed === before.quantity && balance.quantum === null && balance.procurementReady === ready
            && after.included_in_procurement === ready && (ready ? balance.consumptionShortage === "0"
              : compareFormulaGraphDecimals(balance.consumptionShortage, "0") > 0), `STOP_ANCILLARY_CONTROL:${owner.rowId}`);
          return { rowId: owner.rowId, required: before.quantity, accepted: after.quantity, balance };
        });
        invariant(original.rows.filter(row => !selection.owners.some(owner => owner.rowId === row.row_id))
          .every(before => result.rows.find(row => row.row_id === before.row_id)?.quantity === before.quantity), "STOP_ANCILLARY_PHYSICAL_QUANTITY_CHANGED");
        let code: unknown;
        try { assertCanonicalPurchaseReadinessV1(result.rows); } catch (error) { code = (error as { code?: unknown }).code; }
        invariant(amount === "10000" ? code == null : code === "PROCUREMENT_MATERIAL_SHORTAGE", "STOP_ANCILLARY_PROCUREMENT_READINESS");
        controls.push({ accepted: amount, balances, procurementErrorCode: code ?? null });
      }
      if (selection.catalogId === "canonical-work:expanded:bridge_asphalt") {
        const thicker = await run({}, { protective_screed_thickness_mm: 65 });
        invariant(thicker.rows.find(row => row.row_id === "bridge:screed:material:curing-sheet")?.quantity === "5280"
          && thicker.rows.find(row => row.row_id === "bridge:screed:work:place")?.quantity === "312", "STOP_ANCILLARY_BRIDGE_CURING_AREA");
        const legacyOwners = await run({ "bridge:binder:asphalt:material:hot-dense-fine-mix": { quantity: "650.125",
          provenance: { kind: "manual", reason: "VALIDATION_FIXTURE existing hot mix owner control" } },
        "bridge:screed:material:ready-mix": { quantity: "225.125",
          provenance: { kind: "manual", reason: "VALIDATION_FIXTURE existing screed concrete owner control" } } });
        invariant(legacyOwners.rows.find(row => row.row_id === "bridge:binder:asphalt:delivery:truck-trips")?.quantity === "33"
          && (legacyOwners.rows.find(row => row.row_id === "bridge:screed:material:ready-mix")?.calculation_trace as Json).purchaseBalance.requiredSelectedOrder === "207.36",
        "STOP_ANCILLARY_EXISTING_OWNER_REGRESSION");
      }
      observations.push({ catalogId: selection.catalogId, target, sourcePackSha256: selection.sourceSha,
        literalOwnerBindings: selection.owners, locatorSha256: sha(JSON.stringify(locator)), controls, independentPhysicalRowsUnchanged: true });
    }
    invariant(observations.length === 4 && observations.reduce((sum, item) => sum + item.literalOwnerBindings.length, 0) === 15, "STOP_ANCILLARY_FINITE_SCOPE");
    await client.query("rollback");
    const receipt = { status: "GREEN_LOCAL_DB_ANCILLARY_MATERIAL_CONTROLS", capturedAt: new Date().toISOString(), identity, release,
      currentSearchReleaseId: current.searchReleaseId, observations, actualWriter: false, dbWrites: false, nativeAcceptance: false,
      ordinaryActorAcceptance: false, engineeringApproval: false };
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ status: receipt.status, outputPath: OUTPUT, catalogs: 4, ownerOccurrences: 15 })}\n`);
  } finally { await client.end(); }
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
