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
const CATALOG_ID = "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_large_area";
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-31/concrete-accepted-order-current/independent-acceptance.json");
const SOURCE_PACK_PATH = resolve("data/estimate-benchmarks/source-packs/strip-foundation-concrete-placement-preliminary-profile-r1.json");
const OWNER = "strip-pour:material:ready-mix";
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }

async function main() {
  const databaseUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
  const uri = new URL(databaseUrl);
  invariant(uri.hostname === "127.0.0.1" && uri.port === "55432" && uri.pathname === "/rik_r4_runtime_b5_v2", "STOP_CONCRETE_DB_IDENTITY");
  const current = JSON.parse(readFileSync(resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"), "utf8")) as Json;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const identity = (await client.query("select current_database() database,inet_server_port() port")).rows[0];
    const release = (await client.query("select id::text,status,activated_at,source_manifest_sha256 from public.estimate_definition_release where id=$1", [current.definitionReleaseId])).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null, "STOP_CONCRETE_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.runtime_publication_state,m.approved_template_baseline_id::text,
      d.definition_version,d.content_status,d.content_gate_status,d.applicability,p.parameter_count,p.formula_count,p.resource_count
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=m.definition_version_id where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target?.runtime_publication_state === "CANDIDATE" && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN" && target.applicability.requirementBasis === "selected_order_including_contingency", "STOP_CONCRETE_TARGET_GATE");
    invariant([target.parameter_count, target.formula_count, target.resource_count].map(Number).join(":") === "26:16:38", "STOP_CONCRETE_TARGET_SHAPE");
    const parameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateParameterDefinition[];
    const formulas = (await client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0] as Json;
    const search = (await client.query(`select d.definition_version_id::text,d.selectable,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID])).rows[0];
    invariant(search?.status === "draft" && search.selectable === true && search.definition_version_id === target.definition_version_id, "STOP_CONCRETE_SEARCH_JOIN");
    const locator = (await client.query(`select l.locator from public.estimate_work_normative_binding b join public.estimate_normative_locator l on l.id=b.locator_id
      where b.definition_version_id=$1 and l.locator_key=$2`, [target.definition_version_id, "strip-foundation-concrete-accepted-order-s27-31"])).rows[0]?.locator as Json;
    invariant(locator?.sourcePackSha256 === sha256(readFileSync(SOURCE_PACK_PATH)), "STOP_CONCRETE_SOURCE_JOIN");
    const sameIds = (actual: string[], expected: unknown) => Array.isArray(expected) && expected.length === actual.length
      && new Set(expected).size === actual.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
    invariant(parameters.length === 26 && formulas.length === 16 && resources.length === 38
      && sameIds(resources.map(row => row.row_id), locator.expectedResourceIds)
      && sameIds(formulas.map(row => row.formula_id), locator.expectedFormulaIds), "STOP_CONCRETE_EXACT_MATRIX");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0, "STOP_CONCRETE_FORMULA_DRIFT");
    const ids = new Set(parameters.map(parameter => parameter.parameter_id));
    const formulaById = new Map(formulas.map(formula => [formula.formula_id, formula]));
    for (const resource of resources) {
      const graph = resource.resource_graph as Json, formula = formulaById.get(String(graph.formulaId));
      invariant(formula && resource.formula_id === graph.formulaId && formula.output_unit_id === graph.normalizedUom
        && formula.input_parameter_ids?.every(id => ids.has(id)), "STOP_CONCRETE_RESOURCE_BINDING");
    }
    const owner = resources.find(row => row.row_id === OWNER)!;
    const graph = owner.resource_graph as Json;
    const alias = parameters.find(parameter => parameter.parameter_id === graph.effectiveQuantityOutputV1?.parameterId);
    invariant(alias?.truth_metadata?.visibility_role === "INTERNAL_ONLY" && alias.default_value == null
      && (alias.truth_metadata.effective_resource_quantity_v1 as Json)?.sourceRowId === OWNER
      && (alias.truth_metadata.effective_resource_quantity_v1 as Json)?.unitId === "m3"
      && graph.purchaseBalanceV1?.requirementBasis === "selected_order_including_contingency"
      && graph.purchaseBalanceV1.quantityMode === "canonical_decimal" && graph.purchaseBalanceV1.orderQuantumExpression == null, "STOP_CONCRETE_OWNER_BINDING");
    invariant(baseline != null, "STOP_CONCRETE_BASELINE");
    const controls = [];
    for (const [quantity, loads, excess, deficit] of [[null, "33", "0", "0"], ["280.125", "36", "20.925", "0"], ["250", "32", "0", "9.2"]]) {
      const result = await compileCanonicalEstimateCore({ operation: quantity ? "recalculate" : "compile", compilerVersion: "s27-31-concrete-independent-db-readback",
        catalogId: CATALOG_ID, primaryMeasureParameterId: "plan_dimension_concrete_volume_m3", parameterDefinitions: parameters,
        formulaDefinitions: formulas, resourceDefinitions: resources, submittedParameters: { plan_dimension_concrete_volume_m3: 240 },
        confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline), rowOverrides: quantity ? { [OWNER]: { quantity,
          includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE independent selected order; no engineering approval" } } } : {},
        priceItems: [], currencyCode: "KGS", maximumResourceRows: 38, hashJson: async value => sha256(JSON.stringify(value)) });
      const row = (id: string) => result.rows.find(value => value.row_id === `strip-pour:${id}`)!;
      const balance = (row("material:ready-mix").calculation_trace as Json).purchaseBalance as Json;
      invariant(result.rows.length === 36 && result.preliminaryNeeds.length === 0 && row("material:ready-mix").quantity === (quantity ?? "259.2")
        && row("material:ready-mix").included_in_procurement === (deficit === "0") && balance.plannedConsumption === "240"
        && balance.requiredSelectedOrder === "259.2" && balance.consumptionShortage === deficit && balance.excessOrderAboveRequiredConsumption === excess
        && ["delivery:mixer-trips", "quality:delivery-acceptance", "document:delivery-tickets"].every(id => row(id).quantity === loads)
        && row("work:place").quantity === "240" && row("equipment:pump").quantity === "7.5" && row("equipment:vibrator").quantity === "63.84"
        && row("quality:slump").quantity === "5", "STOP_CONCRETE_CONTROL");
      if (deficit !== "0") {
        let code: unknown;
        try { assertCanonicalPurchaseReadinessV1(result.rows); } catch (error) { code = (error as { code?: unknown }).code; }
        invariant(code === "PROCUREMENT_MATERIAL_SHORTAGE", "STOP_CONCRETE_SHORTAGE_READINESS");
      }
      controls.push({ acceptedOrder: quantity ?? "259.2", loads, balance });
    }
    const receipt = { contract: "s27-31-concrete-accepted-order-independent-readback/v1", status: "GREEN_LOCAL_DB_DEFINITION_CONTROLS",
      capturedAt: new Date().toISOString(), identity, release, currentSearchReleaseId: current.searchReleaseId, target,
      matrixSha256: sha256(JSON.stringify(locator)), controls, dbWrites: false, actualWriter: false, nativeAcceptance: false, ordinaryActorAcceptance: false };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: receipt.status, outputPath: OUTPUT_PATH, target: target.definition_version_id })}\n`);
  } finally { await client.end(); }
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
