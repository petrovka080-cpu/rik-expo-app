import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const CONTRACT = "p0-one-monolith-r58-hvac-semantic-owner-repair-50.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/07-boq");

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

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

async function insertBatches(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    if (batch.length === 0) continue;
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `R58_HVAC_50_INSERT_COLUMN_MISMATCH:${table}`);
      return `(${row.map((value) => { values.push(value); return `$${values.length}`; }).join(",")})`;
    });
    await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

function duplicateValues(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function normativeSources(resources: readonly Json[]): string[] {
  const values = new Set<string>();
  for (const resource of resources) {
    const accepted = resource.source_metadata?.acceptedTrace?.normative_source;
    if (typeof accepted === "string" && accepted.trim()) values.add(accepted.trim());
    for (const trace of resource.source_metadata?.normativeTrace ?? []) {
      const id = String(trace.source_id ?? trace.sourceId ?? "").trim();
      if (id) values.add(id);
    }
  }
  return [...values].sort();
}

function collectDeclaredParameterIds(value: unknown, output = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectDeclaredParameterIds(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const object = value as Json;
  if (object.kind === "parameter" && typeof object.id === "string") output.add(object.id);
  if (typeof object.parameterId === "string") output.add(object.parameterId);
  if (Array.isArray(object.parameterSources)) {
    for (const id of object.parameterSources) if (typeof id === "string" && id.trim()) output.add(id);
  }
  for (const child of Object.values(object)) collectDeclaredParameterIds(child, output);
  return output;
}

function resourceParameterIds(resource: Json): Set<string> {
  const output = collectDeclaredParameterIds(resource.inclusion_ast);
  collectDeclaredParameterIds(resource.resource_graph, output);
  for (const values of [
    resource.source_metadata?.formula?.inputParameterIds,
    resource.source_metadata?.ownerBoundary?.handoff_inputs,
  ]) {
    if (!Array.isArray(values)) continue;
    for (const id of values) if (typeof id === "string" && id.trim()) output.add(id);
  }
  return output;
}

function parameterTruth(parameter: Json, definition: Json, formulas: readonly Json[], resources: readonly Json[]): Json {
  const parameterId = String(parameter.parameter_id);
  const formulaIds = formulas.filter((formula) => (formula.input_parameter_ids ?? []).includes(parameterId))
    .map((formula) => String(formula.formula_id)).sort();
  const formulaIdSet = new Set(formulaIds);
  let consumerRows = resources.filter((resource) => formulaIdSet.has(String(resource.formula_id))
    || resourceParameterIds(resource).has(parameterId));
  if (parameterId === "estimate_scope_mode" && consumerRows.length === 0) consumerRows = [...resources];
  invariant(consumerRows.length > 0,
    `R58_HVAC_50_PARAMETER_WITHOUT_CONSUMER:${definition.catalog_id}:${parameterId}`);
  const sourceIds = normativeSources(consumerRows);
  const projectDefined = /productivity|rate|factor|coefficient|efficiency|power|pressure|temperature|capacity/iu.test(parameterId);
  const guideKind = parameter.value_type === "boolean" ? "ENUM_DECISION_RULE"
    : parameter.value_type === "text" ? "PROJECT_DEFINED"
      : projectDefined ? "PROJECT_DEFINED" : "MEASUREMENT_RULE";
  const title = String(parameter.title_ru).trim();
  invariant(title && !title.includes("�"), `R58_HVAC_50_PARAMETER_TITLE:${definition.catalog_id}:${parameterId}`);
  return {
    ...(parameter.truth_metadata ?? {}),
    semantic_parameter_key: parameterId,
    visibility_role: "USER_INPUT",
    value_source_role: "USER_INPUT_REQUIRED",
    guide: {
      guide_short_ru: `Укажите «${title}» по проекту, обмеру, паспорту оборудования или утверждённой технологической документации. Значение относится только к выбранной работе и создаёт новую точную revision.`,
      guide_kind: guideKind,
      source_role: projectDefined ? "PROJECT_OR_EQUIPMENT_PASSPORT" : "PROJECT_OR_SITE_MEASUREMENT",
      guide_version: "P0_ONE_MONOLITH_R58_HVAC_INPUT_GUIDE_V1",
      source_snapshot_hash: sha256({
        catalogId: definition.catalog_id,
        parameterId,
        formulaIds,
        resourceRows: consumerRows.map((row) => row.row_id),
        normativeSourceIds: sourceIds,
      }),
      applicability: `Только для работы ${definition.catalog_id}; не применяется к другим HVAC-работам.`,
      verified_at: "2026-08-17",
    },
    formula_consumers: formulaIds,
    resource_branch_consumers: [...new Set(consumerRows.map((row) => String(row.row_id)))].sort(),
    normative_links: sourceIds,
    validation_rules: ["declared_type", "project_applicability"],
    provenance: {
      sourceCatalogId: definition.catalog_id,
      sourceReleaseId: ACTIVE_RELEASE_ID,
      sourceDefinitionVersionId: definition.id,
      sourceParameterSchemaId: `accepted-hvac-trace:${definition.catalog_id}`,
      baselineOwner: "r58-user-input-no-hidden-default",
    },
    r58InputGuideRepair: {
      contract: CONTRACT,
      specSha256: SPEC_SHA256,
      predecessorTruthMetadataSha256: sha256(parameter.truth_metadata ?? {}),
      noDefaultIntroduced: parameter.default_value == null,
    },
  };
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
    normativeSources: normativeSources([row]),
    costOwnerId: row.cost_owner_id,
    procurementEligible: row.procurement_eligible,
    priceStatus: row.source_metadata?.priceStatus ?? null,
    priceRoute: row.source_metadata?.priceRoute ?? null,
  };
}

function hiddenDuplicateFingerprint(row: Json, formula: Json): string {
  return sha256({
    titleRu: row.title_ru,
    physicalRowType: row.row_type,
    unitId: row.unit_id,
    formulaExpression: formula.expression_source,
    formulaAstSha256: formula.ast_sha256,
    inclusionAst: row.inclusion_ast,
    resourceGraph: row.resource_graph,
    normativeSources: normativeSources([row]),
  });
}

function isChildOwner(row: Json): boolean {
  return row.source_metadata?.priceStatus === "CHILD_OWNER"
    || row.source_metadata?.priceRoute === "CHILD_OWNER_ESTIMATE";
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  invariant(process.argv.length === 2 || (process.argv.length === 3 && apply),
    "R58_HVAC_50_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_HVAC_50_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_HVAC_50_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_HVAC_50_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  const targets = readJsonl(MATRIX_PATH).filter((row) => row.partition === "COMPILE_RED_937"
    && row.domain === "hvac_heat_supply");
  invariant(targets.length === 50 && new Set(targets.map((row) => row.catalog_id)).size === 50,
    `R58_HVAC_50_TARGETS:${targets.length}/50`);
  invariant(targets.every((row) => row.current_validation_blockers?.length === 1
    && /^duplicate_semantic_owners:\d+$/u.test(row.current_validation_blockers[0])),
  "R58_HVAC_50_BLOCKER_DRIFT");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: apply ? "r58-hvac-owner-repair-50-apply" : "r58-hvac-owner-repair-50-dry-run",
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
    const candidate = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1 for update",
      [CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json | undefined;
    invariant(candidate?.status === "draft" && candidate.sealed_at == null,
      "R58_HVAC_50_DRAFT_CANDIDATE_MISSING");
    candidateReleaseId = candidate.id;
    const targetCatalogIds = targets.map((row) => String(row.catalog_id));
    const manifests = (await client.query(`
      select manifest.*,version.release_id definition_release_id,version.source_metadata definition_source_metadata
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version version on version.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[]) order by manifest.catalog_id
    `, [candidateReleaseId, targetCatalogIds])).rows as Json[];
    invariant(manifests.length === 50, `R58_HVAC_50_MANIFESTS:${manifests.length}/50`);
    const successors = manifests.filter((row) => row.definition_release_id === candidateReleaseId
      && row.definition_source_metadata?.r58HvacSemanticOwnerSuccessor?.contract === CONTRACT);
    if (successors.length > 0) {
      invariant(successors.length === 50, `R58_HVAC_50_PARTIAL_IDEMPOTENCY:${successors.length}/50`);
      const ids = successors.map((row) => row.definition_version_id);
      const duplicateOwners = Number((await client.query(`
        select count(*)::int value from (
          select definition_version_id,semantic_owner,count(*) from public.estimate_resource_spec
          where definition_version_id=any($1::uuid[]) group by definition_version_id,semantic_owner
          having count(*)>1 or nullif(btrim(coalesce(semantic_owner,'')),'') is null
        ) invalid
      `, [ids])).rows[0]?.value ?? -1);
      const localDuplicateCost = Number((await client.query(`
        select count(*)::int value from (
          select definition_version_id,cost_owner_id,count(*) from public.estimate_resource_spec
          where definition_version_id=any($1::uuid[])
            and coalesce(source_metadata->>'priceStatus','')<>'CHILD_OWNER'
            and coalesce(source_metadata->>'priceRoute','')<>'CHILD_OWNER_ESTIMATE'
          group by definition_version_id,cost_owner_id having count(*)>1
        ) invalid
      `, [ids])).rows[0]?.value ?? -1);
      invariant(duplicateOwners === 0 && localDuplicateCost === 0,
        `R58_HVAC_50_IDEMPOTENCY_INVALID:${duplicateOwners}:${localDuplicateCost}`);
      idempotent = true;
      await client.query("rollback");
    } else {
      invariant(manifests.every((row) => row.definition_release_id === ACTIVE_RELEASE_ID
        && row.publication_state === "ACCEPTED_INHERITED" && !row.baseline_ready),
      "R58_HVAC_50_PREDECESSOR_MANIFEST_DRIFT");
      const manifestByCatalog = new Map(manifests.map((row) => [String(row.catalog_id), row]));
      for (const target of targets.sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id)))) {
        const manifest = manifestByCatalog.get(String(target.catalog_id));
        invariant(manifest?.definition_version_id === target.definition_version_id,
          `R58_HVAC_50_PREDECESSOR_BINDING:${target.catalog_id}`);
        const definition = (await client.query(
          "select * from public.estimate_definition_version where id=$1", [target.definition_version_id],
        )).rows[0] as Json;
        const parameters = (await client.query(
          "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
          [definition.id],
        )).rows as Json[];
        const formulas = (await client.query(
          "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
          [definition.id],
        )).rows as Json[];
        const resources = (await client.query(
          "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
          [definition.id],
        )).rows as Json[];
        const normativeBindings = (await client.query(
          "select * from public.estimate_work_normative_binding where definition_version_id=$1 order by resource_spec_id,locator_id",
          [definition.id],
        )).rows as Json[];
        const priceBindings = (await client.query(`
          select binding.* from public.estimate_resource_price_route_binding binding
          join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
          where resource.definition_version_id=$1 order by binding.resource_spec_id,binding.priority,binding.route_id
        `, [definition.id])).rows as Json[];
        invariant(parameters.length > 0 && formulas.length === resources.length && resources.length > 0,
          `R58_HVAC_50_CHILD_COUNTS:${definition.catalog_id}`);
        const formulaById = new Map(formulas.map((row) => [String(row.formula_id), row]));
        const ownerCounts = new Map<string, number>();
        for (const row of resources) {
          const owner = String(row.semantic_owner ?? "").trim();
          invariant(owner, `R58_HVAC_50_BLANK_OWNER:${definition.catalog_id}:${row.row_id}`);
          ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1);
        }
        const localCostOwners = resources.filter((row) => !isChildOwner(row))
          .map((row) => String(row.cost_owner_id ?? "").trim()).filter(Boolean);
        invariant(duplicateValues(localCostOwners).length === 0,
          `R58_HVAC_50_LOCAL_COST_DUPLICATE:${definition.catalog_id}`);
        const childCostGroups = new Map<string, Json[]>();
        for (const row of resources.filter(isChildOwner)) {
          const values = childCostGroups.get(String(row.cost_owner_id)) ?? [];
          values.push(row);
          childCostGroups.set(String(row.cost_owner_id), values);
        }
        invariant([...childCostGroups.values()].every((rows) => rows.every((row) => !row.procurement_eligible)),
          `R58_HVAC_50_CHILD_COST_PAYABLE:${definition.catalog_id}`);
        const hiddenBefore = resources.map((row) => hiddenDuplicateFingerprint(
          row, formulaById.get(String(row.formula_id))!,
        ));
        invariant(duplicateValues(hiddenBefore).length === 0,
          `R58_HVAC_50_HIDDEN_DUPLICATE:${definition.catalog_id}`);
        const successorDefinitionId = deterministicUuid(`${CONTRACT}:${candidateReleaseId}:${definition.id}`);
        const resourceIdMap = new Map<string, string>();
        const repairedRows: Json[] = resources.map((row): Json => {
          const oldOwner = String(row.semantic_owner).trim();
          const duplicate = (ownerCounts.get(oldOwner) ?? 0) > 1;
          const role = String(row.row_id).split(":").at(-1);
          const semanticOwner = duplicate ? `${oldOwner}:role:${role}` : oldOwner;
          const successorResourceId = deterministicUuid(`${CONTRACT}:${successorDefinitionId}:${row.row_id}`);
          resourceIdMap.set(String(row.id), successorResourceId);
          if (!duplicate) return { ...row, id: successorResourceId, definition_version_id: successorDefinitionId };
          const defect = {
            contract: CONTRACT,
            rowId: row.row_id,
            predecessorResourceSpecId: row.id,
            oldSemanticOwner: oldOwner,
            newSemanticOwner: semanticOwner,
            preservedCostOwnerId: row.cost_owner_id,
            childOwnerBoundary: isChildOwner(row),
          };
          const metadata = structuredClone(row.source_metadata ?? {});
          metadata.r58SemanticOwnerRepair = { ...defect, specSha256: SPEC_SHA256 };
          return {
            ...row,
            id: successorResourceId,
            definition_version_id: successorDefinitionId,
            semantic_owner: semanticOwner,
            source_metadata: metadata,
            row_sha256: sha256({ contract: CONTRACT, predecessorRowSha256: row.row_sha256,
              rowId: row.row_id, semanticOwner }),
            defect,
          };
        });
        const changed = repairedRows.filter((row) => row.defect);
        invariant(changed.length > 0 && duplicateValues(repairedRows.map((row) => String(row.semantic_owner))).length === 0,
          `R58_HVAC_50_OWNER_REPAIR:${definition.catalog_id}`);
        const successorParameters: Json[] = parameters.map((parameter) => ({
          ...parameter,
          truth_metadata: parameterTruth(parameter, definition, formulas, resources),
          approved_template_baseline_id: null,
        }));
        invariant(successorParameters.every((parameter) => parameter.default_value == null),
          `R58_HVAC_50_HIDDEN_DEFAULT:${definition.catalog_id}`);
        const beforeContentSha256 = sha256(resources.map((row) => contentProjection(
          row, formulaById.get(String(row.formula_id))!,
        )));
        const afterContentSha256 = sha256(repairedRows.map((row) => contentProjection(
          row, formulaById.get(String(row.formula_id))!,
        )));
        invariant(beforeContentSha256 === afterContentSha256,
          `R58_HVAC_50_COMPUTATIONAL_COST_DRIFT:${definition.catalog_id}`);
        const successorVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
          [definition.catalog_id],
        )).rows[0].value);
        const definitionSha256 = sha256({
          contract: CONTRACT,
          predecessorDefinitionSha256: definition.definition_sha256,
          parameters: successorParameters.map((row) => [row.parameter_id, row.default_value, row.constraints_json, row.truth_metadata]),
          formulas: formulas.map((row) => [row.formula_id, row.ast_sha256]),
          resources: repairedRows.map((row) => [row.row_id, row.row_sha256, row.semantic_owner, row.cost_owner_id]),
        });
        await client.query(`insert into public.estimate_definition_version(
          id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
        ) values($1,$2,$3,$4,$5,$6,$7,$8)`, [
          successorDefinitionId, candidateReleaseId, definition.catalog_id, successorVersion,
          definition.passport, definition.applicability, definitionSha256, {
            ...(definition.source_metadata ?? {}),
            r58HvacSemanticOwnerSuccessor: {
              contract: CONTRACT, specSha256: SPEC_SHA256,
              predecessorDefinitionVersionId: definition.id,
              predecessorDefinitionSha256: definition.definition_sha256,
              repairedResourceRows: changed.length,
              childCostBoundaryGroupsPreserved: [...childCostGroups.values()].filter((rows) => rows.length > 1).length,
              beforeContentSha256, afterContentSha256,
            },
          },
        ]);
        await insertBatches(client, "estimate_parameter_definition", [
          "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru",
          "required", "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
        ], successorParameters.map((row) => [
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
        const defectEvidenceSha256 = sha256({
          catalogId: definition.catalog_id,
          predecessorDefinitionVersionId: definition.id,
          successorDefinitionVersionId: successorDefinitionId,
          beforeContentSha256,
          afterContentSha256,
          defects: changed.map((row) => row.defect),
        });
        await client.query(`insert into public.estimate_definition_defect_record(
          id,defect_key,release_id,predecessor_release_id,catalog_id,predecessor_definition_version_id,
          successor_definition_version_id,defect_class,root_cause_ru,affected_resources,before_sha256,
          after_sha256,evidence_sha256,contract_version
        ) values($1,$2,$3,$4,$5,$6,$7,'R54_RESOURCE_SEMANTIC_OWNER_IDENTITY',$8,$9::jsonb,$10,$11,$12,
          'P0_ONE_MONOLITH_R54_DEFECT_LEDGER_V1')`, [
          deterministicUuid(`${CONTRACT}:defect:${successorDefinitionId}`),
          `r58-hvac-semantic-owner:${successorDefinitionId}`,
          candidateReleaseId, ACTIVE_RELEASE_ID, definition.catalog_id, definition.id, successorDefinitionId,
          "Разные неплатёжные interface-роли одного внешнего child owner ошибочно имели одинаковый semantic_owner; построчная identity восстановлена без создания новых владельцев стоимости.",
          JSON.stringify(changed.map((row) => row.defect)), beforeContentSha256, afterContentSha256,
          defectEvidenceSha256,
        ]);
        await client.query(`update public.estimate_cumulative_manifest_entry set
          definition_version_id=$3,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
          approved_template_baseline_id=null,baseline_ready=false,scenario_ready=false,
          definition_hash=$4,entry_sha256=$5 where release_id=$1 and catalog_id=$2`, [
          candidateReleaseId, definition.catalog_id, successorDefinitionId, definitionSha256,
          sha256({ contract: CONTRACT, candidateReleaseId, catalogId: definition.catalog_id,
            definitionVersionId: successorDefinitionId, definitionSha256 }),
        ]);
        records.push({
          catalogId: definition.catalog_id,
          predecessorDefinitionVersionId: definition.id,
          successorDefinitionVersionId: successorDefinitionId,
          parameters: parameters.length,
          formulas: formulas.length,
          resources: resources.length,
          repairedSemanticOwnerRows: changed.length,
          duplicateSemanticOwnersAfter: 0,
          localDuplicateCostOwnersBefore: 0,
          localDuplicateCostOwnersAfter: 0,
          childCostBoundaryGroupsPreserved: [...childCostGroups.values()].filter((rows) => rows.length > 1).length,
          childCostRowsNonPayable: [...childCostGroups.values()].flat().every((row) => !row.procurement_eligible),
          normativeBindings: normativeBindings.length,
          priceBindings: priceBindings.length,
          beforeContentSha256,
          afterContentSha256,
          contentParity: beforeContentSha256 === afterContentSha256,
        });
        changedRows += changed.length;
      }
      invariant(records.length === 50 && changedRows === 3_084,
        `R58_HVAC_50_DENOMINATOR:${records.length}/50:${changedRows}/3084`);
      invariant(records.reduce((sum, row) => sum + row.childCostBoundaryGroupsPreserved, 0) === 514,
        "R58_HVAC_50_CHILD_COST_BOUNDARY_GROUPS");
      const counts = (await client.query(`
        select
          (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_rows,
          (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and publication_state='CANONICAL_SUCCESSOR') successor_entries,
          (select count(*)::int from public.estimate_definition_version where release_id=$1) direct_definitions,
          (select count(*)::int from public.estimate_definition_release where status='active') active_releases
      `, [candidateReleaseId])).rows[0] as Json;
      invariant(counts.manifest_rows === 4_272 && counts.successor_entries === 62
        && counts.direct_definitions === 62 && counts.active_releases === 1,
      `R58_HVAC_50_CANDIDATE_COUNTS:${stable(counts)}`);
      await client.query(`update public.estimate_definition_release set
        source_commit=$2,source_tree=$3,source_package_sha256=$4,
        metadata=metadata||$5::jsonb where id=$1 and status='draft' and sealed_at is null`, [
        candidateReleaseId, head, tree,
        sha256({ contract: CONTRACT, head, tree, changedRows, records: records.map((row) => row.afterContentSha256) }),
        JSON.stringify({ r58HvacSemanticOwnerRepair50: {
          contract: CONTRACT, specSha256: SPEC_SHA256, definitions: 50,
          repairedRows: changedRows, childCostBoundaryGroupsPreserved: 514,
          activeReleaseSwitched: false, searchCutover: false, runtime8081Switched: false,
        } }),
      ]);
      await client.query(apply ? "commit" : "rollback");
    }
  } catch (error) {
    try { await client.query("rollback"); } catch { /* connection may already be aborted */ }
    throw error;
  } finally {
    await client.end();
  }

  const ledgerText = records.map((row) => stable(row)).join("\n") + (records.length > 0 ? "\n" : "");
  const ledgerPath = resolve(OUTPUT_ROOT, apply
    ? "R58_HVAC_SEMANTIC_OWNER_REPAIR_50_APPLY.jsonl"
    : "R58_HVAC_SEMANTIC_OWNER_REPAIR_50_DRY_RUN.jsonl");
  const summary = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: idempotent ? "IDEMPOTENCY_NO_WRITE" : apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    candidateReleaseId,
    definitions: 50,
    changedRows: idempotent ? 0 : changedRows,
    childCostBoundaryGroupsPreserved: 514,
    localDuplicateCostOwners: 0,
    ledgerPath: idempotent ? null : ledgerPath,
    ledgerSha256: idempotent ? null : sha256(ledgerText),
    activeReleaseSwitched: false,
    searchCutover: false,
    runtime8081Switched: false,
    batch009Activated: false,
    status: idempotent
      ? "GREEN_R58_HVAC_SEMANTIC_OWNER_REPAIR_50_IDEMPOTENT_0"
      : apply
        ? "GREEN_R58_HVAC_SEMANTIC_OWNER_REPAIR_50_50_ROWS_3084_APPLIED"
        : "GREEN_R58_HVAC_SEMANTIC_OWNER_REPAIR_50_50_ROWS_3084_DRY_RUN_ROLLED_BACK",
  };
  const summaryPath = resolve(OUTPUT_ROOT, idempotent
    ? "R58_HVAC_SEMANTIC_OWNER_REPAIR_50_IDEMPOTENCY.json"
    : apply
      ? "R58_HVAC_SEMANTIC_OWNER_REPAIR_50_APPLY.json"
      : "R58_HVAC_SEMANTIC_OWNER_REPAIR_50_DRY_RUN.json");
  mkdirSync(dirname(summaryPath), { recursive: true });
  if (!idempotent) writeFileSync(ledgerPath, ledgerText, "utf8");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    mode: summary.mode,
    definitions: summary.definitions,
    changedRows: summary.changedRows,
    childCostBoundaryGroupsPreserved: summary.childCostBoundaryGroupsPreserved,
    candidateReleaseId,
    evidencePath: summaryPath,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
