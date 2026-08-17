import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client, type PoolClient } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/07-boq");
const CONTRACT = "p0-one-monolith-r58-frozen-asphalt-owner-repair.v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function parseJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

async function insertBatches(
  client: Client | PoolClient,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    if (batch.length === 0) continue;
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `R58_ASPHALT_INSERT_COLUMN_MISMATCH:${table}`);
      return `(${row.map((value) => { values.push(value); return `$${values.length}`; }).join(",")})`;
    });
    await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

function normativeSources(row: Json): string[] {
  const sources = new Set<string>();
  const accepted = row.source_metadata?.acceptedTrace;
  if (typeof accepted?.normative_source === "string" && accepted.normative_source.trim()) {
    sources.add(accepted.normative_source.trim());
  }
  for (const trace of row.source_metadata?.normativeTrace ?? []) {
    if (typeof trace?.sourceId === "string" && trace.sourceId.trim()) sources.add(trace.sourceId.trim());
  }
  return [...sources].sort();
}

function ownerFor(row: Json): string {
  const prior = String(row.semantic_owner ?? "").trim();
  const rowId = String(row.row_id);
  invariant(prior.length > 0, `R58_ASPHALT_BLANK_PREDECESSOR_OWNER:${rowId}`);
  const role = rowId.split(":").at(-1)?.trim();
  invariant(role, `R58_ASPHALT_ROW_ROLE_MISSING:${rowId}`);
  return `${prior}:row:${role}`;
}

function repairMetadata(row: Json, semanticOwner: string, defect: Json): Json {
  const metadata = structuredClone(row.source_metadata ?? {});
  if (metadata.acceptedTrace && typeof metadata.acceptedTrace === "object") {
    metadata.acceptedTrace.semantic_owner = semanticOwner;
    if (metadata.acceptedTrace.source_parameters && typeof metadata.acceptedTrace.source_parameters === "object") {
      metadata.acceptedTrace.source_parameters.semanticOwner = semanticOwner;
    }
  }
  metadata.r58SemanticOwnerRepair = { ...defect, specSha256: SPEC_SHA256 };
  return metadata;
}

function duplicateValues(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))].sort();
}

function hiddenDuplicateFingerprint(row: Json, formula: Json): string {
  return sha256({
    section: row.section,
    category: row.category,
    titleRu: row.title_ru,
    physicalRowType: row.row_type,
    unitId: row.unit_id,
    formulaExpression: formula.expression_source,
    formulaAstSha256: formula.ast_sha256,
    inclusionAst: row.inclusion_ast,
    resourceGraph: row.resource_graph,
    normativeSources: normativeSources(row),
    procurementEligible: row.procurement_eligible,
  });
}

function contentProjection(row: Json, formula: Json): Json {
  return {
    rowId: row.row_id,
    ordinal: row.ordinal,
    section: row.section,
    category: row.category,
    titleRu: row.title_ru,
    physicalRowType: row.row_type,
    unitId: row.unit_id,
    formulaId: row.formula_id,
    formulaExpression: formula.expression_source,
    formulaAstSha256: formula.ast_sha256,
    formulaInputParameterIds: formula.input_parameter_ids,
    inclusionAst: row.inclusion_ast,
    resourceGraph: row.resource_graph,
    normativeSources: normativeSources(row),
    costOwnerId: row.cost_owner_id,
    procurementEligible: row.procurement_eligible,
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  invariant(process.argv.length === 2 || (process.argv.length === 3 && apply),
    "R58_ASPHALT_REPAIR_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_ASPHALT_REPAIR_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_ASPHALT_REPAIR_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_ASPHALT_REPAIR_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const targets = parseJsonl(MATRIX_PATH).filter((row) => row.partition === "FROZEN_GREEN_617"
    && row.domain === "asphalt");
  invariant(targets.length === 12 && new Set(targets.map((row) => row.catalog_id)).size === 12,
    `R58_ASPHALT_REPAIR_TARGET_DENOMINATOR:${targets.length}/12`);
  invariant(targets.every((row) => row.frozen_green_drift === true
    && row.current_validation_blockers?.length === 1
    && row.current_validation_blockers[0] === "duplicate_semantic_owners:1"),
  "R58_ASPHALT_REPAIR_TARGET_BLOCKER_DRIFT");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: apply ? "r58-asphalt-owner-repair-apply" : "r58-asphalt-owner-repair-dry-run",
  });
  await client.connect();
  const records: Json[] = [];
  let candidateReleaseId = "";
  let changedRows = 0;
  let idempotent = false;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='45s'");
    const active = (await client.query(
      "select id from public.estimate_definition_release where status='active' for share",
    )).rows;
    invariant(active.length === 1 && active[0].id === ACTIVE_RELEASE_ID, "R58_ASPHALT_REPAIR_ACTIVE_RELEASE_DRIFT");
    const candidate = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1 for update",
      [CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json | undefined;
    invariant(candidate && candidate.status === "draft" && candidate.sealed_at == null,
      "R58_ASPHALT_REPAIR_DRAFT_CANDIDATE_MISSING");
    candidateReleaseId = candidate.id;

    const targetCatalogIds = targets.map((row) => String(row.catalog_id));
    const currentManifest = (await client.query(`
      select manifest.*,version.release_id definition_release_id,version.source_metadata definition_source_metadata
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version version on version.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      order by manifest.catalog_id
    `, [candidateReleaseId, targetCatalogIds])).rows as Json[];
    invariant(currentManifest.length === 12, `R58_ASPHALT_REPAIR_MANIFEST_TARGETS:${currentManifest.length}/12`);
    const successorEntries = currentManifest.filter((row) => row.definition_release_id === candidateReleaseId
      && row.definition_source_metadata?.r58SemanticOwnerSuccessor?.contract === CONTRACT);
    if (successorEntries.length > 0) {
      invariant(successorEntries.length === 12, `R58_ASPHALT_REPAIR_PARTIAL_SUCCESSOR:${successorEntries.length}/12`);
      const successorIds = successorEntries.map((row) => row.definition_version_id);
      const invalid = Number((await client.query(`
        select count(*)::int invalid_count from (
          select definition_version_id,semantic_owner,count(*)
          from public.estimate_resource_spec where definition_version_id=any($1::uuid[])
          group by definition_version_id,semantic_owner
          having nullif(btrim(coalesce(semantic_owner,'')),'') is null or count(*)>1
        ) invalid
      `, [successorIds])).rows[0]?.invalid_count ?? -1);
      invariant(invalid === 0, `R58_ASPHALT_REPAIR_IDEMPOTENCY_INVALID_OWNERS:${invalid}`);
      idempotent = true;
      await client.query("rollback");
    } else {
      invariant(currentManifest.every((row) => row.definition_release_id === ACTIVE_RELEASE_ID),
        "R58_ASPHALT_REPAIR_PREDECESSOR_RELEASE_DRIFT");
      for (const target of targets.sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id)))) {
        const manifest = currentManifest.find((row) => row.catalog_id === target.catalog_id);
        invariant(manifest?.definition_version_id === target.definition_version_id,
          `R58_ASPHALT_REPAIR_PREDECESSOR_BINDING_DRIFT:${target.catalog_id}`);
        const definition = (await client.query(
          "select * from public.estimate_definition_version where id=$1",
          [target.definition_version_id],
        )).rows[0] as Json;
        const parameters = (await client.query(
          "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal,parameter_id",
          [definition.id],
        )).rows as Json[];
        const formulas = (await client.query(
          "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
          [definition.id],
        )).rows as Json[];
        const resources = (await client.query(
          "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal,row_id",
          [definition.id],
        )).rows as Json[];
        const operations = (await client.query(
          "select * from public.estimate_operation_definition where definition_version_id=$1 order by ordinal,operation_id",
          [definition.id],
        )).rows as Json[];
        const passports = (await client.query(
          "select * from public.estimate_professional_passport where definition_version_id=$1",
          [definition.id],
        )).rows as Json[];
        const normativeBindings = (await client.query(`
          select binding.* from public.estimate_work_normative_binding binding
          where binding.definition_version_id=$1 order by binding.resource_spec_id,binding.locator_id
        `, [definition.id])).rows as Json[];
        const priceBindings = (await client.query(`
          select binding.* from public.estimate_resource_price_route_binding binding
          join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
          where resource.definition_version_id=$1 order by binding.resource_spec_id,binding.priority,binding.route_id
        `, [definition.id])).rows as Json[];
        invariant(parameters.length > 0 && formulas.length === resources.length && resources.length > 0,
          `R58_ASPHALT_REPAIR_CHILD_COUNTS:${definition.catalog_id}`);
        invariant(normativeBindings.length === resources.length && priceBindings.length === resources.length,
          `R58_ASPHALT_REPAIR_BINDING_COUNTS:${definition.catalog_id}`);
        const formulaById = new Map(formulas.map((formula) => [String(formula.formula_id), formula]));
        const priorOwners = resources.map((row) => String(row.semantic_owner ?? "").trim());
        invariant(new Set(priorOwners).size === 1 && priorOwners[0],
          `R58_ASPHALT_REPAIR_EXPECTED_ONE_SHARED_OWNER:${definition.catalog_id}`);
        const priorCostOwners = resources.map((row) => String(row.cost_owner_id ?? "").trim()).filter(Boolean);
        invariant(priorCostOwners.length === resources.length && duplicateValues(priorCostOwners).length === 0,
          `R58_ASPHALT_REPAIR_PREDECESSOR_COST_OWNER_COLLISION:${definition.catalog_id}`);
        const hiddenBefore = resources.map((row) => hiddenDuplicateFingerprint(row, formulaById.get(String(row.formula_id))!));
        invariant(duplicateValues(hiddenBefore).length === 0,
          `R58_ASPHALT_REPAIR_HIDDEN_DUPLICATE:${definition.catalog_id}`);

        const successorDefinitionId = deterministicUuid(`${CONTRACT}:${candidateReleaseId}:${definition.id}`);
        const resourceIdMap = new Map<string, string>();
        const repairedRows: Json[] = resources.map((row): Json => {
          const semanticOwner = ownerFor(row);
          const defect = {
            contract: CONTRACT,
            rowId: row.row_id,
            predecessorResourceSpecId: row.id,
            oldSemanticOwner: row.semantic_owner,
            newSemanticOwner: semanticOwner,
            reason: "SHARED_PASSPORT_OWNER_REPLACED_WITH_EXACT_ROW_ROLE_OWNER",
          };
          const successorResourceSpecId = deterministicUuid(`${CONTRACT}:${successorDefinitionId}:${row.row_id}`);
          resourceIdMap.set(String(row.id), successorResourceSpecId);
          return {
            ...row,
            id: successorResourceSpecId,
            definition_version_id: successorDefinitionId,
            semantic_owner: semanticOwner,
            source_metadata: repairMetadata(row, semanticOwner, defect),
            row_sha256: sha256({
              contract: CONTRACT,
              predecessorRowSha256: row.row_sha256,
              rowId: row.row_id,
              semanticOwner,
            }),
            defect,
          };
        });
        const repairedOwners = repairedRows.map((row) => String(row.semantic_owner));
        invariant(duplicateValues(repairedOwners).length === 0,
          `R58_ASPHALT_REPAIR_SUCCESSOR_OWNER_COLLISION:${definition.catalog_id}`);
        const beforeContentSha256 = sha256(resources.map((row) => contentProjection(
          row, formulaById.get(String(row.formula_id))!,
        )));
        const afterContentSha256 = sha256(repairedRows.map((row) => contentProjection(
          row, formulaById.get(String(row.formula_id))!,
        )));
        invariant(beforeContentSha256 === afterContentSha256,
          `R58_ASPHALT_REPAIR_COMPUTATIONAL_OR_COST_DRIFT:${definition.catalog_id}`);
        const successorVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 next_version from public.estimate_definition_version where catalog_id=$1",
          [definition.catalog_id],
        )).rows[0].next_version);
        const resourceTruthSha256 = sha256(repairedRows.map((row) => ({
          rowId: row.row_id,
          rowSha256: row.row_sha256,
          semanticOwner: row.semantic_owner,
        })));
        const definitionSha256 = sha256({
          contract: CONTRACT,
          predecessorDefinitionSha256: definition.definition_sha256,
          parameterSchema: parameters.map((row) => [row.parameter_id, row.default_value, row.constraints_json, row.truth_metadata]),
          formulaGraph: formulas.map((row) => [row.formula_id, row.ast_sha256]),
          resourceTruthSha256,
        });
        await client.query(`insert into public.estimate_definition_version(
          id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
        ) values($1,$2,$3,$4,$5,$6,$7,$8)`, [
          successorDefinitionId, candidateReleaseId, definition.catalog_id, successorVersion,
          definition.passport, definition.applicability, definitionSha256, {
            ...(definition.source_metadata ?? {}),
            r58SemanticOwnerSuccessor: {
              contract: CONTRACT,
              specSha256: SPEC_SHA256,
              predecessorDefinitionVersionId: definition.id,
              predecessorDefinitionSha256: definition.definition_sha256,
              repairedResourceRows: repairedRows.length,
              beforeContentSha256,
              afterContentSha256,
            },
          },
        ]);
        await insertBatches(client, "estimate_parameter_definition", [
          "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru",
          "required", "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
        ], parameters.map((row) => [
          successorDefinitionId, row.parameter_id, row.ordinal, row.value_type, row.unit_id, row.title_ru,
          row.required, row.default_value, row.constraints_json, row.truth_metadata, null,
        ]));
        await insertBatches(client, "estimate_formula_graph", [
          "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
          "input_parameter_ids", "ast_sha256",
        ], formulas.map((row) => [
          successorDefinitionId, row.formula_id, row.output_unit_id, row.expression_source, row.ast,
          row.input_parameter_ids, row.ast_sha256,
        ]));
        await insertBatches(client, "estimate_resource_spec", [
          "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
          "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
          "procurement_eligible", "source_metadata", "row_sha256", "created_at",
        ], repairedRows.map((row) => [
          row.id, successorDefinitionId, row.row_id, row.ordinal, row.section, row.category, row.title_ru, row.row_type,
          row.unit_id, row.formula_id, row.inclusion_ast, row.resource_graph, row.semantic_owner, row.cost_owner_id,
          row.procurement_eligible, row.source_metadata, row.row_sha256, row.created_at,
        ]));
        await insertBatches(client, "estimate_operation_definition", [
          "definition_version_id", "operation_id", "ordinal", "operation_kind", "technical_operation_name_ru",
          "object_and_method", "preconditions", "measurement_basis", "base_unit", "quantity_formula_id",
          "labor_composition_or_trade", "productivity_or_labor_norm", "linked_material_obligations",
          "linked_equipment_obligations", "linked_parameter_ids", "quality_control_and_acceptance",
          "hidden_work_or_test_documents", "included_boundaries", "excluded_boundaries",
          "normative_applicability", "operation_sha256",
        ], operations.map((row) => [
          successorDefinitionId, row.operation_id, row.ordinal, row.operation_kind, row.technical_operation_name_ru,
          row.object_and_method, row.preconditions, row.measurement_basis, row.base_unit, row.quantity_formula_id,
          row.labor_composition_or_trade, row.productivity_or_labor_norm, row.linked_material_obligations,
          row.linked_equipment_obligations, row.linked_parameter_ids, row.quality_control_and_acceptance,
          row.hidden_work_or_test_documents, row.included_boundaries, row.excluded_boundaries,
          row.normative_applicability, row.operation_sha256,
        ]));
        await insertBatches(client, "estimate_professional_passport", [
          "definition_version_id", "release_id", "catalog_id", "passport_version", "passport",
          "parameter_cardinality", "resource_cardinality", "passport_sha256", "created_at",
        ], passports.map((row) => [
          successorDefinitionId, candidateReleaseId, row.catalog_id, row.passport_version, row.passport,
          row.parameter_cardinality, row.resource_cardinality, row.passport_sha256, row.created_at,
        ]));
        await insertBatches(client, "estimate_work_normative_binding", [
          "definition_version_id", "resource_spec_id", "locator_id", "applicability",
        ], normativeBindings.map((row) => [
          successorDefinitionId, resourceIdMap.get(String(row.resource_spec_id)), row.locator_id, row.applicability,
        ]));
        await insertBatches(client, "estimate_resource_price_route_binding", [
          "resource_spec_id", "route_id", "price_key", "priority",
        ], priceBindings.map((row) => [
          resourceIdMap.get(String(row.resource_spec_id)), row.route_id, row.price_key, row.priority,
        ]));

        const rowLedger = resources.map((row, index) => {
          const after = repairedRows[index];
          const formula = formulaById.get(String(row.formula_id))!;
          const beforeProjection = contentProjection(row, formula);
          const afterProjection = contentProjection(after, formula);
          invariant(stable(beforeProjection) === stable(afterProjection),
            `R58_ASPHALT_REPAIR_ROW_PARITY:${definition.catalog_id}:${row.row_id}`);
          return {
            rowId: row.row_id,
            predecessorResourceSpecId: row.id,
            successorResourceSpecId: after.id,
            oldSemanticOwner: row.semantic_owner,
            newSemanticOwner: after.semantic_owner,
            formulaId: row.formula_id,
            formulaExpression: formula.expression_source,
            formulaAstSha256: formula.ast_sha256,
            unitId: row.unit_id,
            inclusionAstSha256: sha256(row.inclusion_ast),
            resourceGraphSha256: sha256(row.resource_graph),
            normativeSources: normativeSources(row),
            costOwnerId: row.cost_owner_id,
            procurementEligible: row.procurement_eligible,
            quantityUomInclusionNormativeCostParity: true,
          };
        });
        const defectEvidenceSha256 = sha256({
          catalogId: definition.catalog_id,
          predecessorDefinitionVersionId: definition.id,
          successorDefinitionVersionId: successorDefinitionId,
          beforeContentSha256,
          afterContentSha256,
          rows: rowLedger,
        });
        await client.query(`insert into public.estimate_definition_defect_record(
          id,defect_key,release_id,predecessor_release_id,catalog_id,predecessor_definition_version_id,
          successor_definition_version_id,defect_class,root_cause_ru,affected_resources,before_sha256,
          after_sha256,evidence_sha256,contract_version
        ) values($1,$2,$3,$4,$5,$6,$7,'R54_RESOURCE_SEMANTIC_OWNER_IDENTITY',$8,$9,$10,$11,$12,
          'P0_ONE_MONOLITH_R54_DEFECT_LEDGER_V1')`, [
          deterministicUuid(`${CONTRACT}:defect:${successorDefinitionId}`),
          `r58-frozen-asphalt-semantic-owner:${successorDefinitionId}`,
          candidateReleaseId, ACTIVE_RELEASE_ID, definition.catalog_id, definition.id, successorDefinitionId,
          "Один паспортный semantic_owner ошибочно использовался всеми разными технологическими строками работы; границы строк восстановлены по неизменным row_id и cost_owner_id.",
          repairedRows.map((row) => row.defect), beforeContentSha256, afterContentSha256, defectEvidenceSha256,
        ]);
        await client.query(`update public.estimate_cumulative_manifest_entry set
          definition_version_id=$3,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
          approved_template_baseline_id=null,baseline_ready=false,scenario_ready=false,
          definition_hash=$4,entry_sha256=$5
          where release_id=$1 and catalog_id=$2`, [
          candidateReleaseId, definition.catalog_id, successorDefinitionId, definitionSha256,
          sha256({ contract: CONTRACT, candidateReleaseId, catalogId: definition.catalog_id,
            definitionVersionId: successorDefinitionId, definitionSha256 }),
        ]);
        records.push({
          catalogId: definition.catalog_id,
          predecessorDefinitionVersionId: definition.id,
          successorDefinitionVersionId: successorDefinitionId,
          predecessorDefinitionVersion: definition.definition_version,
          successorDefinitionVersion: successorVersion,
          counts: {
            parameters: parameters.length,
            formulas: formulas.length,
            resources: resources.length,
            operations: operations.length,
            passports: passports.length,
            normativeBindings: normativeBindings.length,
            priceBindings: priceBindings.length,
          },
          oldSemanticOwner: priorOwners[0],
          newSemanticOwnerCount: new Set(repairedOwners).size,
          duplicateCostOwnersBefore: 0,
          duplicateCostOwnersAfter: duplicateValues(repairedRows.map((row) => String(row.cost_owner_id))).length,
          hiddenDuplicateFingerprintsBefore: 0,
          hiddenDuplicateFingerprintsAfter: duplicateValues(repairedRows.map((row) => hiddenDuplicateFingerprint(
            row, formulaById.get(String(row.formula_id))!,
          ))).length,
          beforeContentSha256,
          afterContentSha256,
          contentParity: beforeContentSha256 === afterContentSha256,
          rowLedger,
        });
        changedRows += repairedRows.length;
      }
      invariant(records.length === 12 && changedRows === 137,
        `R58_ASPHALT_REPAIR_DENOMINATOR:${records.length}/12:${changedRows}/137`);
      invariant(records.every((record) => record.contentParity
        && record.duplicateCostOwnersAfter === 0 && record.hiddenDuplicateFingerprintsAfter === 0),
      "R58_ASPHALT_REPAIR_FINAL_PARITY_FAILED");
      const candidateCounts = (await client.query(`
        select
          (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_rows,
          (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and publication_state='CANONICAL_SUCCESSOR') successor_entries,
          (select count(*)::int from public.estimate_definition_version where release_id=$1) direct_definitions,
          (select count(*)::int from public.estimate_definition_release where status='active') active_releases,
          (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and upper(source_batch) like 'BATCH009%') batch009_rows
      `, [candidateReleaseId])).rows[0] as Json;
      invariant(candidateCounts.manifest_rows === 4_272 && candidateCounts.successor_entries === 12
        && candidateCounts.direct_definitions === 12 && candidateCounts.active_releases === 1
        && candidateCounts.batch009_rows === 0,
      `R58_ASPHALT_REPAIR_CANDIDATE_COUNTS:${stable(candidateCounts)}`);
      await client.query(`update public.estimate_definition_release set
        source_commit=$2,source_tree=$3,source_package_sha256=$4,
        metadata=metadata||$5::jsonb
        where id=$1 and status='draft' and sealed_at is null`, [
        candidateReleaseId, head, tree,
        sha256({ contract: CONTRACT, head, tree, changedRows, records: records.map((record) => record.afterContentSha256) }),
        JSON.stringify({
          r58FrozenAsphaltSemanticOwnerRepair: {
            contract: CONTRACT, specSha256: SPEC_SHA256, definitions: 12, resources: changedRows,
            activeReleaseSwitched: false, searchCutover: false, runtime8081Switched: false,
          },
        }),
      ]);
      await client.query(apply ? "commit" : "rollback");
    }
  } catch (error) {
    try { await client.query("rollback"); } catch { /* connection may already be aborted */ }
    throw error;
  } finally {
    await client.end();
  }

  const evidence = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: idempotent ? "IDEMPOTENCY_NO_WRITE" : apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    database: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
    activeReleaseId: ACTIVE_RELEASE_ID,
    candidateReleaseId,
    targets: 12,
    changedRows: idempotent ? 0 : changedRows,
    predecessorRowsAudited: idempotent ? 137 : changedRows,
    records,
    activeReleaseSwitched: false,
    searchCutover: false,
    runtime8081Switched: false,
    batch009Activated: false,
    status: idempotent
      ? "GREEN_R58_FROZEN_ASPHALT_OWNER_REPAIR_IDEMPOTENT_0"
      : apply
        ? "GREEN_R58_FROZEN_ASPHALT_OWNER_REPAIR_12_12_ROWS_137_137_APPLIED"
        : "GREEN_R58_FROZEN_ASPHALT_OWNER_REPAIR_12_12_ROWS_137_137_DRY_RUN_ROLLED_BACK",
  };
  const output = resolve(OUTPUT_ROOT, idempotent
    ? "R58_FROZEN_ASPHALT_SEMANTIC_OWNER_REPAIR_IDEMPOTENCY.json"
    : apply
      ? "R58_FROZEN_ASPHALT_SEMANTIC_OWNER_REPAIR_APPLY.json"
      : "R58_FROZEN_ASPHALT_SEMANTIC_OWNER_REPAIR_DRY_RUN.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    mode: evidence.mode,
    targets: evidence.targets,
    changedRows: evidence.changedRows,
    candidateReleaseId,
    evidencePath: output,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
