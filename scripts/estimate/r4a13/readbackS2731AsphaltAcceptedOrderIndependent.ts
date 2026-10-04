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
const CATALOG_ID = "canonical-work:base:paving_roads_landscape_interior_asphalt_lay_standard";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-31/asphalt-accepted-order-current/independent-acceptance.json");
const SOURCE_PACK_PATH = resolve("data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json");
const LOCATOR_KEY = "asphalt-upper-course-krer-27-06-020-01-021-01-s27-31-accepted-order";
const MIX_OWNER = "asphalt:material:hot-dense-fine-mix";
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }

async function main() {
  const databaseUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
  const uri = new URL(databaseUrl);
  invariant(uri.hostname === "127.0.0.1" && uri.port === "55432" && uri.pathname === "/rik_r4_runtime_b5_v2", "STOP_S2731_ASPHALT_DB_IDENTITY");
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const identity = (await client.query("select current_database() database,inet_server_addr()::text address,inet_server_port() port")).rows[0];
    const release = (await client.query("select id::text,status,activated_at,source_manifest_sha256 from public.estimate_definition_release where id=$1", [current.definitionReleaseId])).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null, "STOP_S2731_ASPHALT_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.runtime_publication_state,m.approved_template_baseline_id::text,
      d.definition_version,d.content_status,d.content_gate_status,d.applicability,p.parameter_count,p.formula_count,p.resource_count
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=m.definition_version_id where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target?.runtime_publication_state === "CANDIDATE" && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN" && target.applicability.acceptedOrderBalanceScope === "new_order_vs_required_consumption", "STOP_S2731_ASPHALT_TARGET_GATE");
    invariant([target.parameter_count, target.formula_count, target.resource_count].map(Number).join(":") === "31:23:57", "STOP_S2731_ASPHALT_TARGET_SHAPE");
    const parameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateParameterDefinition[];
    const formulas = (await client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0] as Json;
    const search = (await client.query(`select d.definition_version_id::text,d.selectable,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID])).rows[0];
    invariant(search?.status === "draft" && search.selectable === true && search.definition_version_id === target.definition_version_id, "STOP_S2731_ASPHALT_SEARCH_JOIN");
    const locator = (await client.query(`select l.locator from public.estimate_work_normative_binding b join public.estimate_normative_locator l on l.id=b.locator_id
      where b.definition_version_id=$1 and l.locator_key=$2`, [target.definition_version_id, LOCATOR_KEY])).rows[0]?.locator as Json;
    invariant(locator?.sourcePackSha256 === sha256(readFileSync(SOURCE_PACK_PATH)), "STOP_S2731_ASPHALT_MATRIX_SOURCE_JOIN");
    const sameIds = (actual: string[], expected: unknown) => Array.isArray(expected) && expected.length === actual.length
      && new Set(expected).size === actual.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
    invariant(parameters.length === 31 && formulas.length === 23 && resources.length === 57
      && sameIds(resources.map(row => row.row_id), locator.expectedResourceIds)
      && sameIds(formulas.map(row => row.formula_id), locator.expectedFormulaIds), "STOP_S2731_ASPHALT_EXACT_MATRIX");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0, "STOP_S2731_ASPHALT_FORMULA_DRIFT");
    const parameterIds = new Set(parameters.map(parameter => parameter.parameter_id));
    const formulaById = new Map(formulas.map(formula => [formula.formula_id, formula]));
    for (const resource of resources) {
      const graph = resource.resource_graph as Json, formula = formulaById.get(String(graph.formulaId));
      const temperatureCheckPerTrip = resource.row_id === "asphalt:quality:mix-temperature"
        && resource.formula_id === "asphalt_install_truck_trips_v1" && formula?.output_unit_id === "trip"
        && resource.unit_id === "pcs" && graph.normalizedUom === "pcs";
      invariant(formula && resource.formula_id === graph.formulaId
        && (formula.output_unit_id === graph.normalizedUom || temperatureCheckPerTrip)
        && formula.input_parameter_ids?.every(id => parameterIds.has(id)), "STOP_S2731_ASPHALT_RESOURCE_FORMULA_BINDING");
    }
    const owner = resources.find(row => row.row_id === MIX_OWNER)!;
    const ownerGraph = owner.resource_graph as Json;
    const alias = parameters.find(parameter => parameter.parameter_id === ownerGraph.effectiveQuantityOutputV1?.parameterId);
    invariant(alias?.truth_metadata?.visibility_role === "INTERNAL_ONLY" && alias.default_value == null
      && (alias.truth_metadata.effective_resource_quantity_v1 as Json)?.sourceRowId === MIX_OWNER
      && (alias.truth_metadata.effective_resource_quantity_v1 as Json)?.unitId === "t"
      && ownerGraph.purchaseBalanceV1?.quantityMode === "canonical_decimal" && ownerGraph.purchaseBalanceV1.orderQuantumExpression == null,
    "STOP_S2731_ASPHALT_OWNER_BINDING");
    invariant(baseline != null, "STOP_S2731_ASPHALT_BASELINE");
    const compile = (quantity: string | null) => compileCanonicalEstimateCore({ operation: quantity ? "recalculate" : "compile",
      compilerVersion: "s27-31-asphalt-independent-db-readback", catalogId: CATALOG_ID, primaryMeasureParameterId: "area_m2",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters: { area_m2: 5000, layer_thickness_mm: 50 }, confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline),
      rowOverrides: quantity ? { [MIX_OWNER]: { quantity, includedInProcurement: true,
        provenance: { kind: "manual", reason: "VALIDATION_FIXTURE independent readback; no engineering approval" } } } : {},
      priceItems: [], currencyCode: "KGS", maximumResourceRows: 57, hashJson: async value => sha256(JSON.stringify(value)) });
    const controls = [];
    for (const [accepted, trips, tonKm, hours, excess, shortage] of [[null, "31", "12080", "46.5", "0", "0"],
      ["650.125", "33", "13002.5", "49.5", "46.125", "0"], ["600", "30", "12000", "45", "0", "4"]]) {
      const result = await compile(accepted);
      const row = (id: string) => result.rows.find(value => value.row_id === id)!;
      invariant(result.rows.length === 57 && result.preliminaryNeeds.length === 0, "STOP_S2731_ASPHALT_CONTROL_COMPOSITION");
      invariant(row(MIX_OWNER).quantity === (accepted ?? "604") && row(MIX_OWNER).included_in_procurement === (shortage === "0")
        && ((row(MIX_OWNER).calculation_trace as Json).purchaseBalance as Json).excessOrderAboveRequiredConsumption === excess
        && ((row(MIX_OWNER).calculation_trace as Json).purchaseBalance as Json).consumptionShortage === shortage
        && row("asphalt:delivery:truck-trips").quantity === trips && row("asphalt:delivery:ton-km").quantity === tonKm
        && row("asphalt:delivery:truck-machine-hours").quantity === hours && row("asphalt:quality:mix-temperature").quantity === trips
        && row("asphalt:operation:mix-receiving-feed").quantity === "604" && row("asphalt:control:geometric-compacted-volume").quantity === "250",
      "STOP_S2731_ASPHALT_ACCEPTED_ORDER_CONTROL");
      if (shortage !== "0") {
        let code: unknown;
        try { assertCanonicalPurchaseReadinessV1(result.rows); } catch (error) { code = (error as { code?: unknown }).code; }
        invariant(code === "PROCUREMENT_MATERIAL_SHORTAGE", "STOP_S2731_ASPHALT_SHORTAGE_READINESS");
      }
      controls.push({ acceptedOrder: accepted ?? "604", trips, tonKm, machineHours: hours, excess, shortage, rows: result.rows.length });
    }
    const receipt = { contract: "s27-31-asphalt-accepted-order-independent-readback/v1", status: "GREEN_LOCAL_DB_DEFINITION_CONTROLS",
      capturedAt: new Date().toISOString(), identity, release, currentSearchReleaseId: current.searchReleaseId, target,
      matrixSha256: sha256(JSON.stringify(locator)), controls, dbWrites: false, actualWriter: false, nativeAcceptance: false, ordinaryActorAcceptance: false };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: receipt.status, outputPath: OUTPUT_PATH, target: target.definition_version_id })}\n`);
  } finally { await client.end(); }
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
