import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition, type CanonicalEstimateFormulaDefinition, type CanonicalEstimateResourceDefinition } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:road_crossing_sleeves";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-31/road-crossing-sleeves-selected-jacking-current/independent-acceptance.json");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const hashJson = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function main() {
  const uri = new URL(DATABASE_URL);
  invariant(uri.hostname === "127.0.0.1" && uri.port === "55432" && uri.pathname === "/rik_r4_runtime_b5_v2", "STOP_S27_31_CROSSING_DB_IDENTITY");
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8"));
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const identity = (await client.query("select current_database() database,inet_server_addr()::text address,inet_server_port() port")).rows[0];
    const release = (await client.query("select id::text,status,activated_at,definition_count,source_manifest_sha256 from public.estimate_definition_release where id=$1", [current.definitionReleaseId])).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null, "STOP_S27_31_CROSSING_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.runtime_publication_state,m.approved_template_baseline_id::text,
      d.definition_version,d.content_status,d.content_gate_status,d.applicability,p.parameter_count,p.formula_count,p.resource_count,p.payload_sha256
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=m.definition_version_id where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target?.runtime_publication_state === "CANDIDATE" && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN", "STOP_S27_31_CROSSING_READBACK_GATE");
    invariant(target.applicability.selectedScope?.fullOwner === true && target.applicability.engineeringApproved === false, "STOP_S27_31_CROSSING_READBACK_TECHNICAL_SCOPE");
    const parameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = (await client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0] as Json;
    const search = (await client.query(`select d.definition_version_id::text,d.selectable,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID])).rows[0];
    invariant(search?.status === "draft" && search.selectable === true && search.definition_version_id === target.definition_version_id, "STOP_S27_31_CROSSING_READBACK_SEARCH_JOIN");
    invariant(parameters.length === Number(target.parameter_count) && formulas.length === Number(target.formula_count) && resources.length === Number(target.resource_count) && resources.length <= 2000, "STOP_S27_31_CROSSING_READBACK_SHAPE");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0, "STOP_S27_31_CROSSING_READBACK_FORMULA_DRIFT");
    const locator = (await client.query(`select l.locator_key,l.locator,l.excerpt_sha256 from public.estimate_work_normative_binding b
      join public.estimate_normative_locator l on l.id=b.locator_id where b.definition_version_id=$1 and l.locator_key=$2`,
    [target.definition_version_id, "road-crossing-sleeves-selected-jacking-s27-31-v1"])).rows[0] as Json;
    const sourcePackSha256 = createHash("sha256").update(readFileSync(resolve("data/estimate-benchmarks/source-packs/road-crossing-sleeves-selected-jacking-s27-31.json"))).digest("hex");
    invariant(locator?.locator?.sourcePackSha256 === sourcePackSha256, "STOP_S27_31_CROSSING_READBACK_MATRIX_SOURCE_JOIN");
    const stages = locator.locator.stageResourceIds as { stageId: string; resourceIds: string[] }[];
    const requiredStages = ["preparation", "installation", "bedding", "casing", "carrier_and_supports", "internal_fill", "backfill", "completion"];
    invariant(Array.isArray(stages) && stages.length === requiredStages.length && new Set(stages.map(stage => stage.stageId)).size === requiredStages.length
      && requiredStages.every(id => stages.some(stage => stage.stageId === id && stage.resourceIds.length > 0)), "STOP_S27_31_CROSSING_READBACK_STAGE_COVERAGE");
    const expectedResourceIds = stages.flatMap(stage => stage.resourceIds), actualResourceIds = new Set(resources.map(row => row.row_id));
    invariant(expectedResourceIds.length === resources.length && new Set(expectedResourceIds).size === resources.length
      && actualResourceIds.size === resources.length && expectedResourceIds.every(id => actualResourceIds.has(id)), "STOP_S27_31_CROSSING_READBACK_EXACT_RESOURCE_MATRIX");
    const formulaById = new Map(formulas.map(formula => [formula.formula_id, formula]));
    const parameterIds = new Set(parameters.map(parameter => parameter.parameter_id));
    invariant(formulaById.size === formulas.length && parameterIds.size === parameters.length, "STOP_S27_31_CROSSING_READBACK_DUPLICATE_BINDING");
    for (const resource of resources) {
      const graph = resource.resource_graph as Json, formula = formulaById.get(String(graph.formulaId));
      invariant(formula && formula.output_unit_id === graph.normalizedUom && formula.input_parameter_ids?.every(id => parameterIds.has(id))
        && (!Array.isArray(graph.inputParameterIds) || graph.inputParameterIds.every((id: string) => parameterIds.has(id))), "STOP_S27_31_CROSSING_READBACK_RESOURCE_FORMULA_BINDING");
    }
    for (const parameter of parameters) {
      const binding = parameter.truth_metadata?.effective_resource_quantity_v1 as Json | undefined;
      if (binding) invariant(actualResourceIds.has(binding.sourceRowId)
        && (resources.find(row => row.row_id === binding.sourceRowId)?.resource_graph as Json).normalizedUom === binding.unitId,
      "STOP_S27_31_CROSSING_READBACK_EFFECTIVE_SOURCE_BINDING");
    }
    invariant(parameters.every(p => p.default_value == null), "STOP_S27_31_CROSSING_READBACK_HIDDEN_DEFAULT");
    invariant(parameters.filter(p => p.truth_metadata?.visibility_role === "USER_INPUT").every(p => p.truth_metadata?.preliminary_compilation_allowed === true), "STOP_S27_31_CROSSING_READBACK_LOCAL_NEEDS_POLICY");
    invariant(baseline && Object.values(baseline.input_classification).every(c => c === "VALIDATION_FIXTURE"), "STOP_S27_31_CROSSING_READBACK_RUNTIME_FIXTURE_LEAK");
    const ordinary = { rcs_civil_installation_method: "Продавливание с прямоугольными котлованами", rcs_crossing_length_m: "24",
      rcs_casing_outside_diameter_mm: "720", rcs_casing_inside_diameter_mm: "700", rcs_carrier_outside_diameter_mm: "110" };
    const first = await compileCanonicalEstimateCore({ operation: "compile", compilerVersion: "s27-31-crossing-independent-readback", catalogId: CATALOG_ID,
      primaryMeasureParameterId: "rcs_crossing_length_m", parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters: ordinary, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: 2000, hashJson });
    invariant(first.preliminaryNeeds.length > 0 && first.preliminaryNeeds.flatMap(row => row.missing_parameter_ids).includes("rcs_completion_site_mode"), "STOP_S27_31_CROSSING_READBACK_ORIGINAL_NEEDS");
    invariant(!first.preliminaryNeeds.some(row => row.missing_parameter_ids.some(id => id.startsWith("effective_resource_quantity_"))), "STOP_S27_31_CROSSING_READBACK_INTERNAL_QUESTION");
    invariant(!resources.some(row => row.row_id === "rcs:civil:open_cut_excavation_m3"), "STOP_S27_31_CROSSING_READBACK_OPEN_CUT_SCOPE_LEAK");
    const evidence: Json = { contract: "rik-expo-app.s27-31.road-crossing-selected-jacking-independent-readback.v1", capturedUtc: new Date().toISOString(),
      status: "GREEN_LOCAL_PREPARED_DEFINITION_AND_FIRST_COMPOSITION_READBACK", identity, release, searchReleaseId: current.searchReleaseId, target,
      observedShape: { parameters: parameters.length, formulas: formulas.length, resources: resources.length },
      independentStageMatrix: { sourcePackSha256, locatorKey: locator.locator_key, exactResourceIdsHash: hashJson([...actualResourceIds].sort()),
        stages: stages.map(stage => ({ stageId: stage.stageId, resourceCount: stage.resourceIds.length })) },
      firstComposition: { submittedFacts: ordinary, solvedRows: first.rows.length, originalLocalNeeds: first.preliminaryNeeds.length, calculationHash: hashJson(first) },
      engineeringAccepted: false, runtimeDefaultCount: 0, actualEstimateWriterAcceptance: false, nativeAcceptance: false, webAcceptance: false,
      productionAccessed: false, activationPerformed: false, deployPerformed: false };
    evidence.receiptSha256 = hashJson(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true }); writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ status: evidence.status, outputPath: OUTPUT_PATH, receiptSha256: evidence.receiptSha256 })}\n`);
  } finally { await client.end(); }
}
void main().catch(error => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
