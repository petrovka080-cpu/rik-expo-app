import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_SHA256 = "992fddec1b95f95fff14b17057a88246a6d8466252a7f7cf41d2174c054904b0";
const DATABASE_URL = process.env.R54_CANDIDATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r53_exact15_candidate";
const OUTPUT_PATH = resolve(
  ".release-runtime/p0-one-monolith-r54/evidence/05-baseline/EXACT15_SEMANTIC_OWNER_REPAIR.json",
);

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function uuidFromSha256(hash: string): string {
  const normalized = `${hash.slice(0, 12)}4${hash.slice(13, 16)}8${hash.slice(17, 20)}${hash.slice(20, 32)}`;
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

async function insertBatches(client: Client, table: string, columns: readonly string[], rows: readonly unknown[][]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `R54_REPAIR_INSERT_COLUMN_MISMATCH:${table}`);
      return `(${row.map((value) => { values.push(value); return `$${values.length}`; }).join(",")})`;
    });
    await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

function normalizeOwners(resources: readonly Json[]): { rows: Json[]; defects: Json[] } {
  const counts = new Map<string, number>();
  for (const row of resources) {
    const owner = String(row.semantic_owner ?? "").trim();
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  const defects: Json[] = [];
  const rows = resources.map((row) => {
    const previousSemanticOwner = String(row.semantic_owner ?? "").trim();
    if (previousSemanticOwner && (counts.get(previousSemanticOwner) ?? 0) === 1) return { ...row };
    const reason = previousSemanticOwner ? "DUPLICATE_INTERFACE_ROLE_OWNER" : "MISSING_RESOURCE_ROW_OWNER";
    const semanticOwner = previousSemanticOwner
      ? `${previousSemanticOwner}:row:${sha256(row.row_id).slice(0, 16)}`
      : `resource-row:${sha256(row.row_id).slice(0, 24)}`;
    const repairCore = {
      defectClass: "R54_RESOURCE_SEMANTIC_OWNER_IDENTITY",
      reason,
      rowId: row.row_id,
      previousSemanticOwner: previousSemanticOwner || null,
      semanticOwner,
      previousRowSha256: row.row_sha256,
    };
    const rowSha256 = sha256({
      contract: "p0-one-monolith-r54-semantic-owner-repair.v1",
      previousRowSha256: row.row_sha256,
      rowId: row.row_id,
      semanticOwner,
    });
    const defect = { ...repairCore, rowSha256 };
    defects.push(defect);
    return {
      ...row,
      semantic_owner: semanticOwner,
      row_sha256: rowSha256,
      source_metadata: {
        ...(row.source_metadata ?? {}),
        r54SemanticOwnerRepair: { ...defect, specSha256: SPEC_SHA256 },
      },
    };
  });
  const owners = rows.map((row) => String(row.semantic_owner ?? "").trim());
  invariant(owners.every(Boolean) && new Set(owners).size === owners.length, "R54_REPAIR_OWNER_UNIQUENESS_FAILED");
  return { rows, defects };
}

function repairedParameter(row: Json, input: {
  newDefinitionId: string;
  predecessorDefinitionId: string;
  predecessorReleaseId: string;
  baselineId: string;
  acceptanceEvidenceSha256: string;
} | null): Json {
  if (!input || !row.approved_template_baseline_id) return { ...row };
  const truth = structuredClone(row.truth_metadata ?? {});
  truth.provenance = truth.provenance ?? {};
  truth.provenance.sourceReleaseId = input.predecessorReleaseId;
  truth.provenance.sourceDefinitionVersionId = input.predecessorDefinitionId;
  truth.provenance.approvedTemplateBaselineId = input.baselineId;
  truth.provenance.acceptanceEvidenceSha256 = input.acceptanceEvidenceSha256;
  truth.provenance.approvedTemplateBinding = {
    ...(truth.provenance.approvedTemplateBinding ?? {}),
    baselineId: input.baselineId,
    definitionVersionId: input.predecessorDefinitionId,
    acceptanceEvidenceSha256: input.acceptanceEvidenceSha256,
  };
  truth.baseline_assumption_id = `approved-template-baseline:r54:${input.baselineId}:${row.parameter_id}`;
  truth.baseline_source_id = `approved-template:${input.baselineId}:${row.parameter_id}`;
  return { ...row, truth_metadata: truth, approved_template_baseline_id: input.baselineId };
}

async function main(): Promise<void> {
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  invariant(head.startsWith("691acb78"), `R54_REPAIR_WRONG_LINEAGE:${head}`);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r54-exact15-semantic-owner-repair" });
  await client.connect();
  const records: Json[] = [];
  let releaseId = "";
  let predecessorReleaseId = "";
  try {
    await client.query("begin");
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where status='active' for update",
    )).rows[0] as Json | undefined;
    invariant(predecessor, "R54_REPAIR_ACTIVE_RELEASE_MISSING");
    invariant(predecessor.definition_count === 15, `R54_REPAIR_DENOMINATOR:${predecessor.definition_count}/15`);
    predecessorReleaseId = predecessor.id;
    const definitions = (await client.query(
      "select * from public.estimate_definition_version where release_id=$1 order by catalog_id",
      [predecessor.id],
    )).rows as Json[];
    invariant(definitions.length === 15, `R54_REPAIR_DEFINITION_DENOMINATOR:${definitions.length}/15`);

    const repairIdentity = { contract: "p0-one-monolith-r54-semantic-owner-repair.v1", head, tree, predecessorReleaseId };
    releaseId = uuidFromSha256(sha256({ ...repairIdentity, kind: "release" }));
    const releaseKey = `p0-r54-exact15-owner-repair-${head.slice(0, 12)}-${predecessor.id.slice(0, 8)}`;
    const releaseManifestSha256 = sha256(repairIdentity);
    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
      parameter_count,formula_count
    ) values($1,$2,3,'draft',$3,$4,$5,15,0,$6::jsonb,$7,$5,0,0)`, [
      releaseId, releaseKey, head, tree, releaseManifestSha256, json({
        ...repairIdentity,
        specSha256: SPEC_SHA256,
        cutover: false,
        batch009Activated: false,
      }), predecessor.id,
    ]);

    let parameterCount = 0;
    let formulaCount = 0;
    let resourceCount = 0;
    for (const definition of definitions) {
      const parametersResult = await client.query(
        "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
        [definition.id],
      );
      const formulasResult = await client.query(
        "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
        [definition.id],
      );
      const resourcesResult = await client.query(
        "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
        [definition.id],
      );
      const baselineResult = await client.query(
        "select * from public.estimate_approved_template_baseline where definition_version_id=$1",
        [definition.id],
      );
      const parameters = parametersResult.rows as Json[];
      const formulas = formulasResult.rows as Json[];
      const resources = resourcesResult.rows as Json[];
      const priorBaseline = baselineResult.rows[0] as Json | undefined;
      const ownerRepair = normalizeOwners(resources);
      const beforeSha256 = sha256(resources.map((row) => [row.row_id, row.semantic_owner, row.row_sha256]));
      const afterSha256 = sha256(ownerRepair.rows.map((row) => [row.row_id, row.semantic_owner, row.row_sha256]));
      const newDefinitionId = uuidFromSha256(sha256({ ...repairIdentity, catalogId: definition.catalog_id, kind: "definition" }));
      const definitionSha256 = sha256({
        predecessorDefinitionSha256: definition.definition_sha256,
        parameterSha256: sha256(parameters.map((row) => [row.parameter_id, row.default_value, row.truth_metadata])),
        formulaSha256: sha256(formulas.map((row) => [row.formula_id, row.ast_sha256])),
        resourceSha256: afterSha256,
        repairContract: repairIdentity.contract,
      });
      await client.query(`insert into public.estimate_definition_version(
        id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
      ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb)`, [
        newDefinitionId, releaseId, definition.catalog_id, Number(definition.definition_version) + 1,
        json(definition.passport), json(definition.applicability), definitionSha256, json({
          ...(definition.source_metadata ?? {}),
          r54SemanticOwnerSuccessor: {
            predecessorDefinitionVersionId: definition.id,
            predecessorDefinitionSha256: definition.definition_sha256,
            repairedResourceCount: ownerRepair.defects.length,
            beforeSha256,
            afterSha256,
            specSha256: SPEC_SHA256,
          },
        }),
      ]);

      let baselineBinding: Parameters<typeof repairedParameter>[1] = null;
      if (priorBaseline) {
        const baselineId = uuidFromSha256(sha256({ ...repairIdentity, catalogId: definition.catalog_id, kind: "baseline" }));
        const acceptanceEvidenceSha256 = sha256({
          predecessorAcceptanceEvidenceSha256: priorBaseline.acceptance_evidence_sha256,
          predecessorBaselineId: priorBaseline.id,
          predecessorDefinitionId: definition.id,
          successorDefinitionId: newDefinitionId,
          beforeSha256,
          afterSha256,
        });
        await client.query(`insert into public.estimate_approved_template_baseline(
          id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
          parameter_schema_sha256,input_values,input_classification,uom_by_parameter,formula_consumer_ids,
          resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,proposal_source_refs,
          validation_scenario_refs,acceptance_evidence_sha256,accepted_release_id,accepted_at,
          supersedes_baseline_id,contract_version
        ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
          $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,now(),$18,$19)`, [
          baselineId, `r54-owner-repair-${definition.catalog_id}-${baselineId}`, definition.catalog_id,
          newDefinitionId, definition.id, priorBaseline.parameter_schema_sha256,
          json(priorBaseline.input_values), json(priorBaseline.input_classification), json(priorBaseline.uom_by_parameter),
          json(priorBaseline.formula_consumer_ids), json(priorBaseline.resource_consumer_row_ids),
          json(priorBaseline.normative_source_ids), json(priorBaseline.guide_provenance_ru),
          json([...(priorBaseline.proposal_source_refs ?? []), `defect-ledger:${releaseId}:${definition.catalog_id}`]),
          json([...(priorBaseline.validation_scenario_refs ?? []), "R54_SEMANTIC_OWNER_UNIQUENESS_REPAIR"]),
          acceptanceEvidenceSha256, releaseId, priorBaseline.id, "APPROVED_TEMPLATE_BASELINE_R54_V1",
        ]);
        baselineBinding = {
          newDefinitionId,
          predecessorDefinitionId: definition.id,
          predecessorReleaseId: predecessor.id,
          baselineId,
          acceptanceEvidenceSha256,
        };
      }

      const successorParameters = parameters.map((row) => repairedParameter(row, baselineBinding));
      await insertBatches(client, "estimate_parameter_definition", [
        "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru",
        "required", "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
      ], successorParameters.map((row) => [
        newDefinitionId, row.parameter_id, row.ordinal, row.value_type, row.unit_id, row.title_ru,
        row.required, row.default_value == null ? null : json(row.default_value), json(row.constraints_json),
        json(row.truth_metadata), row.approved_template_baseline_id,
      ]));
      await insertBatches(client, "estimate_formula_graph", [
        "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
        "input_parameter_ids", "ast_sha256",
      ], formulas.map((row) => [
        newDefinitionId, row.formula_id, row.output_unit_id, row.expression_source, json(row.ast),
        row.input_parameter_ids, row.ast_sha256,
      ]));
      await insertBatches(client, "estimate_resource_spec", [
        "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
        "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
        "procurement_eligible", "source_metadata", "row_sha256", "created_at",
      ], ownerRepair.rows.map((row) => [
        uuidFromSha256(sha256({ ...repairIdentity, catalogId: definition.catalog_id, rowId: row.row_id })),
        newDefinitionId, row.row_id, row.ordinal, row.section, row.category, row.title_ru, row.row_type,
        row.unit_id, row.formula_id, json(row.inclusion_ast), json(row.resource_graph), row.semantic_owner,
        row.cost_owner_id, row.procurement_eligible, json(row.source_metadata), row.row_sha256, row.created_at,
      ]));

      if (ownerRepair.defects.length > 0) {
        const evidenceSha256 = sha256({
          catalogId: definition.catalog_id,
          predecessorDefinitionVersionId: definition.id,
          successorDefinitionVersionId: newDefinitionId,
          defects: ownerRepair.defects,
          beforeSha256,
          afterSha256,
        });
        await client.query(`insert into public.estimate_definition_defect_record(
          id,defect_key,release_id,predecessor_release_id,catalog_id,predecessor_definition_version_id,
          successor_definition_version_id,defect_class,root_cause_ru,affected_resources,before_sha256,
          after_sha256,evidence_sha256,contract_version
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14)`, [
          uuidFromSha256(evidenceSha256), `r54-semantic-owner:${newDefinitionId}`, releaseId, predecessor.id,
          definition.catalog_id, definition.id, newDefinitionId, "R54_RESOURCE_SEMANTIC_OWNER_IDENTITY",
          "Пустой владелец строки либо один владелец границы был повторно назначен разным интерфейсным ролям.",
          json(ownerRepair.defects), beforeSha256, afterSha256, evidenceSha256,
          "P0_ONE_MONOLITH_R54_DEFECT_LEDGER_V1",
        ]);
      }
      records.push({
        catalogId: definition.catalog_id,
        predecessorDefinitionVersionId: definition.id,
        successorDefinitionVersionId: newDefinitionId,
        predecessorDefinitionVersion: definition.definition_version,
        successorDefinitionVersion: Number(definition.definition_version) + 1,
        resourceCount: resources.length,
        repairedResourceCount: ownerRepair.defects.length,
        beforeSha256,
        afterSha256,
        baselineSuperseded: Boolean(priorBaseline),
      });
      parameterCount += parameters.length;
      formulaCount += formulas.length;
      resourceCount += resources.length;
    }

    const affectedDefinitions = records.filter((row) => row.repairedResourceCount > 0).length;
    invariant(affectedDefinitions === 14 || (affectedDefinitions === 0
      && predecessor.metadata?.contract === "p0-one-monolith-r54-semantic-owner-repair.v1"),
    `R54_REPAIR_AFFECTED_DEFINITION_DENOMINATOR:${affectedDefinitions}:EXPECTED_14_OR_NORMALIZED_SUCCESSOR`);
    await client.query("update public.estimate_definition_release set status='retired' where id=$1 and status='active'", [predecessor.id]);
    await client.query(`update public.estimate_definition_release set
      status='active',sealed_at=now(),activated_at=now(),parameter_count=$2,formula_count=$3,resource_row_count=$4
      where id=$1 and status='draft'`, [releaseId, parameterCount, formulaCount, resourceCount]);
    await client.query("commit");

    const evidence = {
      schemaVersion: "p0-one-monolith-r54-exact15-semantic-owner-repair.v1",
      specSha256: SPEC_SHA256,
      head,
      tree,
      candidateDatabase: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
      predecessorReleaseId,
      releaseId,
      forwardOnly: true,
      predecessorRevisionsPreserved: true,
      sourceDatabaseWrites: 0,
      batch009Activated: false,
      counts: {
        definitions: records.length,
        affectedDefinitions,
        baselineBindingsRealigned: records.filter((row) => row.baselineSuperseded).length,
        repairedResources: records.reduce((sum, row) => sum + row.repairedResourceCount, 0),
        parameters: parameterCount,
        formulas: formulaCount,
        resources: resourceCount,
      },
      records,
      status: "GREEN_FORWARD_SUCCESSOR_ACTIVE",
    };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: evidence.status, releaseId, counts: evidence.counts, evidencePath: OUTPUT_PATH }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
