import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  evaluateFormulaGraph,
  type FormulaAst,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  evaluateInclusionGraph,
  type InclusionGraphAst,
} from "../../../src/lib/estimate/backendPlatform/inclusionGraph";

type Json = Record<string, any>;

const SPEC_SHA256 = "4bd245a1537da872dbc6ce6681c6571baeb146aa1123b5402e71bbec10050b62";
const DATABASE_URL = process.env.R56_CANDIDATE_DATABASE_URL ?? process.env.R54_CANDIDATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r53_exact15_candidate";
const EVIDENCE_ROOT = resolve(".release-runtime/p0-one-monolith-r56/evidence/07-boq");
const LEDGER_PATH = resolve(EVIDENCE_ROOT, "SEMANTIC_OWNER_BEFORE_AFTER_776.jsonl");
const SUMMARY_PATH = resolve(EVIDENCE_ROOT, "SEMANTIC_OWNER_NUMERIC_PARITY.json");
const DEFECTS_PATH = resolve(EVIDENCE_ROOT, "SEMANTIC_OWNER_DEFECT_RECORDS_14.jsonl");
const REVISIONS_PATH = resolve(EVIDENCE_ROOT, "PREDECESSOR_REVISIONS_26_PRESERVATION.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value === undefined) return '"__undefined__"';
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function withoutRepairMetadata(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value ?? null;
  const clone = structuredClone(value as Json);
  delete clone.r54SemanticOwnerRepair;
  return clone;
}

function immutableResourceProjection(row: Json): Json {
  return {
    rowId: row.row_id,
    ordinal: row.ordinal,
    section: row.section,
    category: row.category,
    titleRu: row.title_ru,
    resourceRole: row.row_type,
    unitId: row.unit_id,
    formulaId: row.formula_id,
    inclusionAst: row.inclusion_ast,
    resourceGraph: row.resource_graph,
    costOwnerId: row.cost_owner_id,
    procurementEligible: row.procurement_eligible,
    normativeSourceMetadata: withoutRepairMetadata(row.source_metadata),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function formulaProjection(row: Json): Json {
  return {
    formulaId: row.formula_id,
    outputUnitId: row.output_unit_id,
    expressionSource: row.expression_source,
    ast: row.ast,
    inputParameterIds: row.input_parameter_ids,
    astSha256: row.ast_sha256,
  };
}

function parameterProjection(row: Json): Json {
  return {
    parameterId: row.parameter_id,
    ordinal: row.ordinal,
    valueType: row.value_type,
    unitId: row.unit_id,
    titleRu: row.title_ru,
    required: row.required,
    defaultValue: row.default_value,
    constraints: row.constraints_json,
  };
}

function defaultInputs(rows: readonly Json[]): Json {
  return Object.fromEntries(rows.map((row) => [String(row.parameter_id), row.default_value]));
}

function resourceKey(definitionId: string, rowId: string): string {
  return `${definitionId}\u0000${rowId}`;
}

function formulaKey(definitionId: string, formulaId: string): string {
  return `${definitionId}\u0000${formulaId}`;
}

function definitionKey(definitionId: string): string {
  return String(definitionId);
}

function valuesForFormula(inputValues: Json): Record<string, string | number | bigint> {
  const values: Record<string, string | number | bigint> = {};
  for (const [key, value] of Object.entries(inputValues ?? {})) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") values[key] = value;
  }
  return values;
}

function isCostBearing(row: Json): boolean {
  return Boolean(row.procurement_eligible) || !["interface", "document"].includes(String(row.row_type));
}

function scopeOwner(row: Json): string | null {
  const candidates = [
    row.resource_graph?.scopeOwner,
    row.resource_graph?.scope_owner,
    row.source_metadata?.scopeOwner,
    row.source_metadata?.scope_owner,
  ];
  const selected = candidates.find((value) => String(value ?? "").trim().length > 0);
  return selected == null ? null : String(selected);
}

function costOwnerTopology(rows: readonly Json[]): Json[] {
  const owners = new Map<string, Json[]>();
  for (const row of rows) {
    const owner = String(row.cost_owner_id ?? "").trim();
    if (!owner) continue;
    const key = `${row.catalog_id}\u0000${owner}`;
    const values = owners.get(key) ?? [];
    values.push(row);
    owners.set(key, values);
  }
  return [...owners.entries()].map(([key, values]) => {
    const [catalogId, costOwnerId] = key.split("\u0000");
    return {
      catalogId,
      costOwnerId,
      rowCount: values.length,
      costBearing: values.some(isCostBearing),
      procurementEligible: values.some((row) => Boolean(row.procurement_eligible)),
      resourceRoles: [...new Set(values.map((row) => String(row.row_type)))].sort(),
      rowIds: values.map((row) => String(row.row_id)).sort(),
    };
  }).sort((left, right) => `${left.catalogId}:${left.costOwnerId}`.localeCompare(`${right.catalogId}:${right.costOwnerId}`));
}

async function rowsForDefinitions(client: Client, table: string, definitionIds: readonly string[]): Promise<Json[]> {
  return (await client.query(
    `select * from public.${table} where definition_version_id = any($1::uuid[]) order by definition_version_id`,
    [definitionIds],
  )).rows as Json[];
}

async function main(): Promise<void> {
  execFileSync("git", ["merge-base", "--is-ancestor", "691acb78", "HEAD"], { stdio: "ignore" });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const tree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r54-exact15-semantic-owner-parity-audit",
  });
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    const activeRelease = (await client.query(
      "select * from public.estimate_definition_release where status='active'",
    )).rows[0] as Json | undefined;
    invariant(activeRelease, "R54_PARITY_ACTIVE_RELEASE_MISSING");
    invariant(Number(activeRelease.definition_count) === 15, `R54_PARITY_ACTIVE_DENOMINATOR:${activeRelease.definition_count}/15`);

    const defects = (await client.query(`
      select d.*, v.catalog_id successor_catalog_id
      from public.estimate_definition_defect_record d
      join public.estimate_definition_version v on v.id=d.successor_definition_version_id
      where d.defect_class='R54_RESOURCE_SEMANTIC_OWNER_IDENTITY'
      order by d.catalog_id
    `)).rows as Json[];
    invariant(defects.length === 14, `R54_PARITY_DEFECT_RECORD_DENOMINATOR:${defects.length}/14`);
    const repairReleaseIds = [...new Set(defects.map((row) => String(row.release_id)))];
    invariant(repairReleaseIds.length === 1, `R54_PARITY_REPAIR_RELEASE_COUNT:${repairReleaseIds.length}`);
    const predecessorReleaseIds = [...new Set(defects.map((row) => String(row.predecessor_release_id)))];
    invariant(predecessorReleaseIds.length === 1, `R54_PARITY_PREDECESSOR_RELEASE_COUNT:${predecessorReleaseIds.length}`);

    const finalDefinitions = (await client.query(
      "select * from public.estimate_definition_version where release_id=$1 order by catalog_id",
      [activeRelease.id],
    )).rows as Json[];
    invariant(finalDefinitions.length === 15, `R54_PARITY_FINAL_DEFINITION_DENOMINATOR:${finalDefinitions.length}/15`);
    const finalDefinitionByCatalog = new Map(finalDefinitions.map((row) => [String(row.catalog_id), row]));
    const predecessorDefinitionIds = defects.map((row) => String(row.predecessor_definition_version_id));
    const repairDefinitionIds = defects.map((row) => String(row.successor_definition_version_id));
    const finalAffectedDefinitionIds = defects.map((row) => {
      const definition = finalDefinitionByCatalog.get(String(row.catalog_id));
      invariant(definition, `R54_PARITY_FINAL_DEFINITION_MISSING:${row.catalog_id}`);
      return String(definition.id);
    });

    const predecessorResources = await rowsForDefinitions(client, "estimate_resource_spec", predecessorDefinitionIds);
    const repairResources = await rowsForDefinitions(client, "estimate_resource_spec", repairDefinitionIds);
    const finalResources = await rowsForDefinitions(client, "estimate_resource_spec", finalAffectedDefinitionIds);
    const predecessorFormulas = await rowsForDefinitions(client, "estimate_formula_graph", predecessorDefinitionIds);
    const repairFormulas = await rowsForDefinitions(client, "estimate_formula_graph", repairDefinitionIds);
    const finalFormulas = await rowsForDefinitions(client, "estimate_formula_graph", finalAffectedDefinitionIds);
    const predecessorParameters = await rowsForDefinitions(client, "estimate_parameter_definition", predecessorDefinitionIds);
    const repairParameters = await rowsForDefinitions(client, "estimate_parameter_definition", repairDefinitionIds);
    const finalParameters = await rowsForDefinitions(client, "estimate_parameter_definition", finalAffectedDefinitionIds);
    const baselineRows = (await client.query(`
      select * from public.estimate_approved_template_baseline
      where definition_version_id = any($1::uuid[])
      order by definition_version_id
    `, [[...predecessorDefinitionIds, ...repairDefinitionIds, ...finalAffectedDefinitionIds]])).rows as Json[];
    invariant(baselineRows.length === 39, `R56_PARITY_BASELINE_LINEAGE_DENOMINATOR:${baselineRows.length}/39`);
    const baselineByDefinition = new Map(baselineRows.map((row) => [definitionKey(row.definition_version_id), row]));
    const parametersByDefinition = new Map<string, Json[]>();
    for (const row of [...predecessorParameters, ...repairParameters, ...finalParameters]) {
      const key = String(row.definition_version_id);
      const values = parametersByDefinition.get(key) ?? [];
      values.push(row);
      parametersByDefinition.set(key, values);
    }
    const resourceMaps = [predecessorResources, repairResources, finalResources].map(
      (rows) => new Map(rows.map((row) => [resourceKey(String(row.definition_version_id), String(row.row_id)), row])),
    );
    const formulaMaps = [predecessorFormulas, repairFormulas, finalFormulas].map(
      (rows) => new Map(rows.map((row) => [formulaKey(String(row.definition_version_id), String(row.formula_id)), row])),
    );

    const ledger: Json[] = [];
    const affectedKeys = new Set<string>();
    for (const defect of defects) {
      const catalogId = String(defect.catalog_id);
      const predecessorDefinitionId = String(defect.predecessor_definition_version_id);
      const repairDefinitionId = String(defect.successor_definition_version_id);
      const finalDefinition = finalDefinitionByCatalog.get(catalogId)!;
      const finalDefinitionId = String(finalDefinition.id);
      const predecessorBaseline = baselineByDefinition.get(predecessorDefinitionId);
      const repairBaseline = baselineByDefinition.get(repairDefinitionId);
      const finalBaseline = baselineByDefinition.get(finalDefinitionId);
      invariant(Boolean(predecessorBaseline) === Boolean(repairBaseline)
        && Boolean(predecessorBaseline) === Boolean(finalBaseline), `R56_PARITY_BASELINE_KIND_DRIFT:${catalogId}`);
      const byOrdinal = (left: Json, right: Json) => Number(left.ordinal) - Number(right.ordinal)
        || String(left.parameter_id).localeCompare(String(right.parameter_id));
      const predecessorParameterRows = [...(parametersByDefinition.get(predecessorDefinitionId) ?? [])].sort(byOrdinal);
      const repairParameterRows = [...(parametersByDefinition.get(repairDefinitionId) ?? [])].sort(byOrdinal);
      const finalParameterRows = [...(parametersByDefinition.get(finalDefinitionId) ?? [])].sort(byOrdinal);
      invariant(stable(predecessorParameterRows.map(parameterProjection)) === stable(repairParameterRows.map(parameterProjection))
        && stable(predecessorParameterRows.map(parameterProjection)) === stable(finalParameterRows.map(parameterProjection)),
      `R56_PARITY_PARAMETER_VALUE_OR_SCHEMA_DRIFT:${catalogId}`);
      const predecessorInputValues = predecessorBaseline?.input_values ?? defaultInputs(predecessorParameterRows);
      const repairInputValues = repairBaseline?.input_values ?? defaultInputs(repairParameterRows);
      const finalInputValues = finalBaseline?.input_values ?? defaultInputs(finalParameterRows);
      const predecessorNormativeSourceIds = predecessorBaseline?.normative_source_ids ?? [];
      const repairNormativeSourceIds = repairBaseline?.normative_source_ids ?? [];
      const finalNormativeSourceIds = finalBaseline?.normative_source_ids ?? [];
      invariant(stable(predecessorInputValues) === stable(repairInputValues)
        && stable(predecessorInputValues) === stable(finalInputValues),
      `R56_PARITY_BASELINE_INPUT_DRIFT:${catalogId}`);
      invariant(stable(predecessorNormativeSourceIds) === stable(repairNormativeSourceIds)
        && stable(predecessorNormativeSourceIds) === stable(finalNormativeSourceIds),
      `R56_PARITY_BASELINE_NORMATIVE_SOURCE_DRIFT:${catalogId}`);
      const predecessorInputs = valuesForFormula(predecessorInputValues);
      const repairInputs = valuesForFormula(repairInputValues);
      const finalInputs = valuesForFormula(finalInputValues);
      const affectedResources = defect.affected_resources as Json[];
      invariant(Array.isArray(affectedResources) && affectedResources.length > 0,
        `R54_PARITY_DEFECT_RESOURCES_MISSING:${catalogId}`);
      for (const recorded of affectedResources) {
        const rowId = String(recorded.rowId);
        const uniqueKey = `${catalogId}\u0000${rowId}`;
        invariant(!affectedKeys.has(uniqueKey), `R54_PARITY_DUPLICATE_LEDGER_ROW:${catalogId}:${rowId}`);
        affectedKeys.add(uniqueKey);
        const predecessor = resourceMaps[0].get(resourceKey(predecessorDefinitionId, rowId));
        const repair = resourceMaps[1].get(resourceKey(repairDefinitionId, rowId));
        const final = resourceMaps[2].get(resourceKey(finalDefinitionId, rowId));
        invariant(predecessor && repair && final, `R54_PARITY_RESOURCE_LINEAGE_MISSING:${catalogId}:${rowId}`);
        const immutableBefore = immutableResourceProjection(predecessor);
        const immutableRepair = immutableResourceProjection(repair);
        const immutableFinal = immutableResourceProjection(final);
        invariant(stable(immutableBefore) === stable(immutableRepair)
          && stable(immutableBefore) === stable(immutableFinal),
        `R54_PARITY_RESOURCE_PAYLOAD_DRIFT:${catalogId}:${rowId}`);
        invariant(String(predecessor.semantic_owner ?? "") === String(recorded.previousSemanticOwner ?? ""),
          `R54_PARITY_LEDGER_PREVIOUS_OWNER_DRIFT:${catalogId}:${rowId}`);
        invariant(String(repair.semantic_owner) === String(recorded.semanticOwner)
          && String(final.semantic_owner) === String(recorded.semanticOwner),
        `R54_PARITY_LEDGER_NEW_OWNER_DRIFT:${catalogId}:${rowId}`);
        invariant(String(predecessor.row_sha256) === String(recorded.previousRowSha256)
          && String(repair.row_sha256) === String(recorded.rowSha256)
          && String(final.row_sha256) === String(recorded.rowSha256),
        `R54_PARITY_ROW_SHA_LINEAGE_DRIFT:${catalogId}:${rowId}`);

        const formulaId = String(predecessor.formula_id);
        const predecessorFormula = formulaMaps[0].get(formulaKey(predecessorDefinitionId, formulaId));
        const repairFormula = formulaMaps[1].get(formulaKey(repairDefinitionId, formulaId));
        const finalFormula = formulaMaps[2].get(formulaKey(finalDefinitionId, formulaId));
        invariant(predecessorFormula && repairFormula && finalFormula,
          `R54_PARITY_FORMULA_LINEAGE_MISSING:${catalogId}:${rowId}:${formulaId}`);
        const formulaBefore = formulaProjection(predecessorFormula);
        const formulaRepair = formulaProjection(repairFormula);
        const formulaFinal = formulaProjection(finalFormula);
        invariant(stable(formulaBefore) === stable(formulaRepair) && stable(formulaBefore) === stable(formulaFinal),
          `R54_PARITY_QUANTITY_FORMULA_DRIFT:${catalogId}:${rowId}`);
        const predecessorQuantity = evaluateFormulaGraph(predecessorFormula.ast as FormulaAst, predecessorInputs);
        const repairQuantity = evaluateFormulaGraph(repairFormula.ast as FormulaAst, repairInputs);
        const finalQuantity = evaluateFormulaGraph(finalFormula.ast as FormulaAst, finalInputs);
        invariant(predecessorQuantity === repairQuantity && predecessorQuantity === finalQuantity,
          `R54_PARITY_BOQ_QUANTITY_DRIFT:${catalogId}:${rowId}:${predecessorQuantity}:${finalQuantity}`);
        const predecessorIncluded = predecessor.inclusion_ast == null
          ? true
          : evaluateInclusionGraph(predecessor.inclusion_ast as InclusionGraphAst, predecessorInputValues);
        const repairIncluded = repair.inclusion_ast == null
          ? true
          : evaluateInclusionGraph(repair.inclusion_ast as InclusionGraphAst, repairInputValues);
        const finalIncluded = final.inclusion_ast == null
          ? true
          : evaluateInclusionGraph(final.inclusion_ast as InclusionGraphAst, finalInputValues);
        invariant(predecessorIncluded === repairIncluded && predecessorIncluded === finalIncluded,
          `R54_PARITY_INCLUSION_RESULT_DRIFT:${catalogId}:${rowId}`);
        const quantityFingerprint = sha256({
          catalogId,
          rowId,
          formula: formulaBefore,
          unitId: predecessor.unit_id,
          quantity: predecessorQuantity,
          included: predecessorIncluded,
        });
        const normativeSourcesSha256 = sha256({
          rowMetadata: withoutRepairMetadata(predecessor.source_metadata),
          approvedBaselineSourceIds: predecessorNormativeSourceIds,
        });
        const sourceRowSha256 = String(
          predecessor.source_metadata?.sourceRowSha256
          ?? predecessor.source_metadata?.source_row_sha256
          ?? sha256({ catalogId, rowId, sourceMetadata: withoutRepairMetadata(predecessor.source_metadata) }),
        );
        ledger.push({
          schemaVersion: "p0-one-monolith-r56-semantic-owner-row-parity.v1",
          specSha256: SPEC_SHA256,
          catalogId,
          catalog_id: catalogId,
          rowId,
          row_id: rowId,
          old_definition_version_id: predecessorDefinitionId,
          new_definition_version_id: finalDefinitionId,
          ordinal: predecessor.ordinal,
          title_ru: predecessor.title_ru,
          row_type: predecessor.row_type,
          old_semantic_owner: predecessor.semantic_owner,
          new_semantic_owner: final.semantic_owner,
          cost_owner_id: predecessor.cost_owner_id,
          scope_owner: scopeOwner(predecessor),
          formula_id: formulaId,
          unit_id: predecessor.unit_id,
          quantity_formula_sha256: sha256(formulaBefore),
          inclusion_ast_sha256: sha256(predecessor.inclusion_ast),
          normative_sources_sha256: normativeSourcesSha256,
          source_row_sha256: sourceRowSha256,
          before_row_sha256: predecessor.row_sha256,
          after_row_sha256: final.row_sha256,
          change_reason: recorded.reason,
          defect_record_id: defect.id,
          predecessorDefinitionVersionId: predecessorDefinitionId,
          repairDefinitionVersionId: repairDefinitionId,
          finalDefinitionVersionId: finalDefinitionId,
          semanticOwner: {
            before: predecessor.semantic_owner,
            after: final.semantic_owner,
            changed: predecessor.semantic_owner !== final.semantic_owner,
          },
          identity: {
            formulaId,
            resourceRole: predecessor.row_type,
            costOwnerId: predecessor.cost_owner_id,
            procurementEligible: predecessor.procurement_eligible,
          },
          quantity: {
            expressionSource: predecessorFormula.expression_source,
            formulaAstSha256: predecessorFormula.ast_sha256,
            unitId: predecessor.unit_id,
            evaluatedBefore: predecessorQuantity,
            evaluatedAfter: finalQuantity,
            boqQuantityFingerprintBefore: quantityFingerprint,
            boqQuantityFingerprintAfter: quantityFingerprint,
          },
          inclusion: {
            astSha256: sha256(predecessor.inclusion_ast),
            evaluatedBefore: predecessorIncluded,
            evaluatedAfter: finalIncluded,
          },
          normativeSource: {
            rowMetadataSha256Before: sha256(withoutRepairMetadata(predecessor.source_metadata)),
            rowMetadataSha256After: sha256(withoutRepairMetadata(final.source_metadata)),
            approvedBaselineSourceIdsSha256Before: sha256(predecessorNormativeSourceIds),
            approvedBaselineSourceIdsSha256After: sha256(finalNormativeSourceIds),
          },
          parity: {
            rowIdentity: true,
            quantityFormula: true,
            unitOfMeasure: true,
            inclusionLogic: true,
            normativeSource: true,
            costOwner: true,
            procurementEligibility: true,
            boqQuantity: true,
            noHiddenMergeOrMultiplication: true,
          },
        });
      }
    }
    invariant(ledger.length === 776, `R54_PARITY_LEDGER_DENOMINATOR:${ledger.length}/776`);

    const attachCatalog = (rows: readonly Json[], definitionIds: readonly string[]): Json[] => {
      const catalogByDefinition = new Map<string, string>();
      defects.forEach((defect, index) => catalogByDefinition.set(definitionIds[index], String(defect.catalog_id)));
      return rows.map((row) => ({ ...row, catalog_id: catalogByDefinition.get(String(row.definition_version_id)) }));
    };
    const predecessorAffectedResources = attachCatalog(predecessorResources, predecessorDefinitionIds);
    const repairAffectedResources = attachCatalog(repairResources, repairDefinitionIds);
    const finalAffectedResources = attachCatalog(finalResources, finalAffectedDefinitionIds);
    const predecessorCostTopology = costOwnerTopology(predecessorAffectedResources);
    const repairCostTopology = costOwnerTopology(repairAffectedResources);
    const finalCostTopology = costOwnerTopology(finalAffectedResources);
    invariant(stable(predecessorCostTopology) === stable(repairCostTopology)
      && stable(predecessorCostTopology) === stable(finalCostTopology), "R54_PARITY_COST_OWNER_TOPOLOGY_DRIFT");
    const repeatedCostOwnerGroups = finalCostTopology.filter((row) => row.rowCount > 1);
    const duplicateCostBearingOwnerGroups = repeatedCostOwnerGroups.filter((row) => row.costBearing);
    const repeatedNonCostBoundaryGroups = repeatedCostOwnerGroups.filter((row) => !row.costBearing);
    invariant(duplicateCostBearingOwnerGroups.length === 0,
      `R54_PARITY_DUPLICATE_COST_BEARING_OWNERS:${duplicateCostBearingOwnerGroups.length}`);
    invariant(repeatedNonCostBoundaryGroups.every((row) => row.resourceRoles.length === 1
      && row.resourceRoles[0] === "interface" && !row.procurementEligible),
    "R54_PARITY_REPEATED_NON_COST_OWNER_CLASSIFICATION_FAILED");

    const normativeBindings = (await client.query(`
      select v.release_id, count(*)::int binding_count
      from public.estimate_work_normative_binding b
      join public.estimate_definition_version v on v.id=b.definition_version_id
      where v.release_id=any($1::uuid[])
      group by v.release_id
    `, [[predecessorReleaseIds[0], repairReleaseIds[0], activeRelease.id]])).rows as Json[];
    const normativeBindingCounts = new Map(normativeBindings.map((row) => [String(row.release_id), Number(row.binding_count)]));
    const beforeNormativeBindingCount = normativeBindingCounts.get(predecessorReleaseIds[0]) ?? 0;
    const repairNormativeBindingCount = normativeBindingCounts.get(repairReleaseIds[0]) ?? 0;
    const finalNormativeBindingCount = normativeBindingCounts.get(String(activeRelease.id)) ?? 0;
    invariant(beforeNormativeBindingCount === repairNormativeBindingCount
      && beforeNormativeBindingCount === finalNormativeBindingCount,
    "R54_PARITY_NORMATIVE_BINDING_COUNT_DRIFT");

    const predecessorRevisions = (await client.query(
      "select * from public.estimate_revision where release_id=$1 order by created_at,id",
      [predecessorReleaseIds[0]],
    )).rows as Json[];
    const predecessorRevisionIds = predecessorRevisions.map((row) => String(row.id));
    const predecessorRevisionRows = (await client.query(`
      select * from public.estimate_revision_row
      where revision_id=any($1::uuid[])
      order by revision_id,ordinal,row_id
    `, [predecessorRevisionIds])).rows as Json[];
    const predecessorArtifacts = (await client.query(`
      select * from public.estimate_revision_artifact
      where revision_id=any($1::uuid[])
      order by revision_id,artifact_kind
    `, [predecessorRevisionIds])).rows as Json[];
    invariant(predecessorRevisions.length === 26,
      `R56_PARITY_PREDECESSOR_REVISION_DENOMINATOR:${predecessorRevisions.length}/26`);
    invariant(predecessorRevisions.every((revision) => predecessorRevisionRows
      .filter((row) => String(row.revision_id) === String(revision.id)).length === Number(revision.row_count)),
    "R56_PARITY_PREDECESSOR_REVISION_ROW_COUNT_UNREADABLE");
    invariant(predecessorArtifacts.length === 26
      && predecessorArtifacts.every((artifact) => artifact.status === "ready" && /^[0-9a-f]{64}$/u.test(String(artifact.sha256))),
    `R56_PARITY_PREDECESSOR_ARTIFACT_DENOMINATOR_OR_STATE:${predecessorArtifacts.length}/26`);
    const predecessorRevisionEvidence = {
      schemaVersion: "p0-one-monolith-r56-predecessor-revisions-preservation.v1",
      specSha256: SPEC_SHA256,
      head,
      tree,
      releaseId: predecessorReleaseIds[0],
      counts: {
        revisions: predecessorRevisions.length,
        revisionRows: predecessorRevisionRows.length,
        artifacts: predecessorArtifacts.length,
        readyPdf: predecessorArtifacts.filter((row) => row.artifact_kind === "pdf" && row.status === "ready").length,
        readyProcurement: predecessorArtifacts.filter((row) => row.artifact_kind === "procurement" && row.status === "ready").length,
      },
      fingerprints: {
        revisionsSha256: sha256(predecessorRevisions),
        revisionRowsSha256: sha256(predecessorRevisionRows),
        artifactsSha256: sha256(predecessorArtifacts),
      },
      revisions: predecessorRevisions.map((revision) => {
        const rows = predecessorRevisionRows.filter((row) => String(row.revision_id) === String(revision.id));
        const artifacts = predecessorArtifacts.filter((row) => String(row.revision_id) === String(revision.id));
        return {
          revisionId: revision.id,
          catalogId: revision.catalog_id,
          parentRevisionId: revision.parent_revision_id,
          status: revision.status,
          declaredRowCount: revision.row_count,
          readableRowCount: rows.length,
          revisionChecksumSha256: revision.checksum_sha256,
          rowsSha256: sha256(rows),
          artifacts: artifacts.map((artifact) => ({
            kind: artifact.artifact_kind,
            status: artifact.status,
            byteSize: artifact.byte_size,
            sha256: artifact.sha256,
          })),
        };
      }),
      immutableRowsReadable: true,
      immutableArtifactsReadable: true,
      verdict: "GREEN_26_OF_26_PREDECESSOR_REVISIONS_PRESERVED",
    };

    const ledgerPayload = ledger
      .sort((left, right) => `${left.catalogId}:${left.rowId}`.localeCompare(`${right.catalogId}:${right.rowId}`))
      .map((row) => JSON.stringify(row))
      .join("\n");
    const aggregateBoqFingerprintBefore = sha256(ledger.map((row) => [
      row.catalogId,
      row.rowId,
      row.quantity.boqQuantityFingerprintBefore,
    ]));
    const aggregateBoqFingerprintAfter = sha256(ledger.map((row) => [
      row.catalogId,
      row.rowId,
      row.quantity.boqQuantityFingerprintAfter,
    ]));
    invariant(aggregateBoqFingerprintBefore === aggregateBoqFingerprintAfter,
      "R54_PARITY_AGGREGATE_BOQ_FINGERPRINT_DRIFT");
    const summary = {
      schemaVersion: "p0-one-monolith-r56-semantic-owner-parity-summary.v1",
      specSha256: SPEC_SHA256,
      head,
      tree,
      candidateDatabase: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
      releases: {
        predecessor: predecessorReleaseIds[0],
        repair: repairReleaseIds[0],
        finalActive: activeRelease.id,
      },
      counts: {
        defectRecords: defects.length,
        affectedDefinitions: defects.length,
        repairedRows: ledger.length,
        uniqueRepairedRows: affectedKeys.size,
        predecessorRowsInAffectedDefinitions: predecessorResources.length,
        repairRowsInAffectedDefinitions: repairResources.length,
        finalRowsInAffectedDefinitions: finalResources.length,
        duplicateCostBearingOwnerGroups: duplicateCostBearingOwnerGroups.length,
        repeatedNonCostBoundaryGroups: repeatedNonCostBoundaryGroups.length,
        repeatedNonCostBoundaryRows: repeatedNonCostBoundaryGroups.reduce((sum, row) => sum + row.rowCount, 0),
        normativeBindingsBefore: beforeNormativeBindingCount,
        normativeBindingsRepair: repairNormativeBindingCount,
        normativeBindingsAfter: finalNormativeBindingCount,
        predecessorRevisionsPreserved: predecessorRevisions.length,
        predecessorRevisionRowsReadable: predecessorRevisionRows.length,
        predecessorArtifactsReadable: predecessorArtifacts.length,
      },
      parity: {
        immutableResourcePayload776: true,
        semanticOwnerChangeMatchesImmutableDefectLedger: true,
        quantityFormulaAndAst: true,
        unitOfMeasure: true,
        inclusionAstAndEvaluatedResult: true,
        normativeSourceMetadataAndApprovedBaselineIds: true,
        boqQuantityAll776: true,
        costOwnerTopology: true,
        noDuplicateCostBearingOwners: true,
        noHiddenCostOwnerMerge: true,
        noHiddenResourceOrQuantityMultiplication: true,
        predecessorRevisionsPreserved: true,
      },
      fingerprints: {
        ledgerSha256: sha256(`${ledgerPayload}\n`),
        aggregateBoqQuantityBeforeSha256: aggregateBoqFingerprintBefore,
        aggregateBoqQuantityAfterSha256: aggregateBoqFingerprintAfter,
        costOwnerTopologyBeforeSha256: sha256(predecessorCostTopology),
        costOwnerTopologyRepairSha256: sha256(repairCostTopology),
        costOwnerTopologyAfterSha256: sha256(finalCostTopology),
      },
      repeatedNonCostBoundaryOwners: repeatedNonCostBoundaryGroups,
      verdict: "GREEN_776_OF_776_SEMANTIC_OWNER_ONLY_WITH_COST_PARITY",
    };
    mkdirSync(dirname(LEDGER_PATH), { recursive: true });
    writeFileSync(LEDGER_PATH, `${ledgerPayload}\n`, "utf8");
    writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    writeFileSync(DEFECTS_PATH, `${defects.map((defect) => JSON.stringify({
      schemaVersion: "p0-one-monolith-r56-semantic-owner-defect-record.v1",
      specSha256: SPEC_SHA256,
      defectRecordId: defect.id,
      defectKey: defect.defect_key,
      releaseId: defect.release_id,
      predecessorReleaseId: defect.predecessor_release_id,
      catalogId: defect.catalog_id,
      predecessorDefinitionVersionId: defect.predecessor_definition_version_id,
      successorDefinitionVersionId: defect.successor_definition_version_id,
      defectClass: defect.defect_class,
      rootCauseRu: defect.root_cause_ru,
      affectedResourceCount: defect.affected_resources.length,
      beforeSha256: defect.before_sha256,
      afterSha256: defect.after_sha256,
      evidenceSha256: defect.evidence_sha256,
    })).join("\n")}\n`, "utf8");
    writeFileSync(REVISIONS_PATH, `${JSON.stringify(predecessorRevisionEvidence, null, 2)}\n`, "utf8");
    await client.query("commit");
    process.stdout.write(`${JSON.stringify({
      verdict: summary.verdict,
      repairedRows: ledger.length,
      duplicateCostBearingOwnerGroups: duplicateCostBearingOwnerGroups.length,
      repeatedNonCostBoundaryGroups: repeatedNonCostBoundaryGroups.length,
      aggregateBoqQuantitySha256: aggregateBoqFingerprintBefore,
      ledgerPath: LEDGER_PATH,
      summaryPath: SUMMARY_PATH,
      defectRecordsPath: DEFECTS_PATH,
      predecessorRevisionsPath: REVISIONS_PATH,
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
