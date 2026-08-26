import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { buildAllBatch004R56CanonicalSuccessorDefinitions } from "./batch004R56SharedCoreProjection";

type Json = Record<string, any>;

const ROOT = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56");
const BACKEND = resolve(ROOT, "backend/BATCH004_BACKEND_REVISION_PARITY_R56.json");
const STATIC = resolve(ROOT, "static/BATCH004_R56_STATIC_RECONCILIATION.json");
const IDENTITIES = resolve(ROOT, "static/BATCH004_R56_COMPONENT_IDENTITIES.json");
const OUTPUT_DIR = resolve(ROOT, "content");
const CARDS = resolve(OUTPUT_DIR, "BATCH004_R56_CONTENT_ACCEPTANCE_CARDS.jsonl");
const OUTPUT = resolve(OUTPUT_DIR, "BATCH004_R56_CONTENT_ACCEPTANCE.json");
const DATABASE_URL = process.env.BATCH004_R56_DATABASE_URL
  ?? "postgresql://postgres:postgres@127.0.0.1:55436/batch004_r56_backend";

function sha256(value: Buffer | string | unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string" ? value : canonicalEstimateStableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function exactSourceBytes(sourceIdentity: Json): { checked: number; mismatches: string[] } {
  const mismatches: string[] = [];
  for (const entry of sourceIdentity.entries as Json[]) {
    const path = resolve(String(entry.path));
    try {
      const bytes = readFileSync(path);
      if (bytes.length !== Number(entry.bytes) || sha256(bytes) !== entry.sha256) mismatches.push(String(entry.path));
    } catch {
      mismatches.push(String(entry.path));
    }
  }
  return { checked: sourceIdentity.entries.length, mismatches };
}

function backendCategory(category: string): string {
  if (category === "labor") return "construction_work";
  if (category === "transport") return "delivery";
  if (category === "equipment") return "machine_equipment";
  return category;
}

async function main(): Promise<void> {
  const backend = JSON.parse(readFileSync(BACKEND, "utf8")) as Json;
  const staticReport = JSON.parse(readFileSync(STATIC, "utf8")) as Json;
  const identities = JSON.parse(readFileSync(IDENTITIES, "utf8")) as Json;
  invariant(backend.status === "GREEN_R56_BATCH004_ISOLATED_BACKEND_PARITY_NO_RELEASE", "BATCH004_CONTENT_BACKEND_RED");
  invariant(staticReport.status === "GREEN_R56_BATCH004_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING", "BATCH004_CONTENT_STATIC_RED");
  invariant(backend.releaseStatus === "prepared" && backend.releaseActivated === false, "BATCH004_CONTENT_RELEASE_STATE_RED");
  invariant(backend.proofs.length === 393 && staticReport.verdicts.length === 393, "BATCH004_CONTENT_EVIDENCE_DENOMINATOR_RED");
  invariant(Object.values(staticReport.defectCounters as Record<string, number>).every((value) => value === 0), "BATCH004_CONTENT_STATIC_DEFECT_RED");
  const sourceBytes = exactSourceBytes(backend.sourceIdentity);
  invariant(sourceBytes.checked > 0 && sourceBytes.mismatches.length === 0, `BATCH004_CONTENT_BACKEND_SOURCE_DRIFT:${sourceBytes.mismatches.join(",")}`);

  const definitions = buildAllBatch004R56CanonicalSuccessorDefinitions();
  const definitionById = new Map(definitions.map((definition) => [definition.catalogId, definition]));
  const identityById = new Map((identities.definitions as Json[]).map((identity) => [identity.catalogId, identity]));
  const staticById = new Map((staticReport.verdicts as Json[]).map((verdict) => [verdict.catalogId, verdict]));
  const proofById = new Map((backend.proofs as Json[]).map((proof) => [proof.catalogId, proof]));
  invariant(definitionById.size === 393 && identityById.size === 393 && staticById.size === 393 && proofById.size === 393,
    "BATCH004_CONTENT_IDENTITY_SET_RED");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch004-r56-content-binding" });
  await client.connect();
  try {
    const rows = (await client.query(`select
      dv.id definition_version_id,dv.catalog_id,dv.definition_sha256,dv.passport,dv.source_metadata,
      cp.decision content_decision,cp.parameter_count content_parameter_count,
      cp.formula_count content_formula_count,cp.resource_count content_resource_count,
      baseline.id baseline_id,manifest.publication_state,manifest.runtime_publication_state,
      search.document_sha256 search_document_sha256,search.selectable search_selectable,
      coalesce((select jsonb_agg(jsonb_build_object(
        'formulaId',formula.formula_id,'expressionSource',formula.expression_source,
        'outputUnitId',formula.output_unit_id) order by formula.formula_id)
        from public.estimate_formula_graph formula where formula.definition_version_id=dv.id),'[]'::jsonb) formulas,
      coalesce((select jsonb_agg(jsonb_build_object(
        'rowId',resource.row_id,'formulaId',resource.formula_id,'unitId',resource.unit_id,
        'category',resource.category,'procurementEligible',resource.procurement_eligible,
        'semanticOwner',resource.semantic_owner,'costOwnerId',resource.cost_owner_id) order by resource.ordinal)
        from public.estimate_resource_spec resource where resource.definition_version_id=dv.id),'[]'::jsonb) resources,
      (select count(*)::integer from public.estimate_revision revision
        where revision.release_id=dv.release_id and revision.catalog_id=dv.catalog_id) revisions,
      (select count(*)::integer from public.estimate_revision revision
        where revision.release_id=dv.release_id and revision.catalog_id=dv.catalog_id
          and revision.parent_revision_id is not null) child_revisions,
      (select count(*)::integer from public.estimate_revision_artifact artifact
        join public.estimate_revision revision on revision.id=artifact.revision_id
        where revision.release_id=dv.release_id and revision.catalog_id=dv.catalog_id and artifact.status='ready') artifacts,
      (select count(*)::integer from public.estimate_compile_job job
        where job.target_release_id=dv.release_id and job.catalog_id=dv.catalog_id and job.status='succeeded') succeeded_jobs,
      (select count(*)::integer from public.estimate_compile_job job
        where job.target_release_id=dv.release_id and job.catalog_id=dv.catalog_id and job.status='failed') failed_jobs
    from public.estimate_definition_version dv
    join public.estimate_content_passport_r3 cp on cp.definition_version_id=dv.id
    join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=dv.id
    join public.estimate_cumulative_manifest_entry manifest on manifest.definition_version_id=dv.id
    join public.estimate_search_document search on search.definition_version_id=dv.id
    where dv.release_id=$1
    order by dv.catalog_id`, [backend.releaseId])).rows as Json[];
    invariant(rows.length === 393, `BATCH004_CONTENT_DB_DENOMINATOR_RED:${rows.length}`);

    const cards = rows.map((row) => {
      const definition = definitionById.get(row.catalog_id)!;
      const staticVerdict = staticById.get(row.catalog_id)!;
      const proof = proofById.get(row.catalog_id)!;
      const identity = identityById.get(row.catalog_id)!;
      const databaseResources = row.resources as Json[];
      const databaseFormulas = row.formulas as Json[];
      const resourceById = new Map(databaseResources.map((resource) => [resource.rowId, resource]));
      const formulaById = new Map(databaseFormulas.map((formula) => [formula.formulaId, formula]));
      const criteria = {
        canonicalDefinitionIdentity: identity.definitionSha256 === definition.definitionSha256
          && identity.engineeringSourcePackHash === definition.passport.engineeringSourcePack.sourcePackHash,
        exactDefinitionVersion: proof.definitionVersionId === row.definition_version_id,
        successorMetadata: row.source_metadata?.successorVersionId === "Batch004CanonicalSuccessorR56"
          && row.source_metadata?.truth_contract_version === "R5.6"
          && row.source_metadata?.noRelease === true,
        physicalPassport: row.passport?.batchId === "BATCH-004"
          && row.passport?.technologyFamily === "DRYWALL_DOMAIN_COMPLETION"
          && row.passport?.titleRu === definition.passport.titleRu
          && row.passport?.physicalResultRu === definition.passport.physicalResultRu,
        formulaIdentity: databaseFormulas.length === definition.formulas.length
          && definition.formulas.every((formula) => {
            const actual = formulaById.get(formula.formulaId);
            return actual?.expressionSource === formula.expressionSource && actual?.outputUnitId === formula.outputUnitId;
          }),
        resourceIdentity: databaseResources.length === definition.resources.length
          && definition.resources.every((resource) => {
            const actual = resourceById.get(resource.rowId);
            return actual?.formulaId === resource.formulaId
              && actual?.unitId === resource.outputUnitId
              && actual?.category === backendCategory(resource.category)
              && actual?.procurementEligible === resource.procurementEligible
              && actual?.semanticOwner === resource.semanticOwnerId
              && actual?.costOwnerId === resource.costOwnerId;
          }),
        contentPassport: row.content_decision?.allowed === true
          && Number(row.content_formula_count) === definition.formulas.length
          && Number(row.content_resource_count) === definition.resources.length,
        registryAndSearch: row.baseline_id != null
          && row.publication_state === "CANONICAL_SUCCESSOR"
          && row.runtime_publication_state === "CANDIDATE"
          && row.search_document_sha256 != null
          && row.search_selectable === true,
        immutableHistory: Number(row.revisions) === 3 && Number(row.child_revisions) === 2,
        artifactParity: Number(row.artifacts) === 2,
        jobParity: Number(row.succeeded_jobs) === 5 && Number(row.failed_jobs) === 0,
        backendProof: proof.finalStatus === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"
          && proof.uiParity === "GREEN"
          && proof.historyParity === "GREEN"
          && proof.pdfParity === "GREEN"
          && proof.procurementParity === "GREEN",
        independentStaticOracle: staticVerdict.status === "GREEN_R56_BATCH004_STATIC_RECONCILIATION_BACKEND_REPLAY_PENDING"
          && staticVerdict.independentOracle === "GREEN"
          && staticVerdict.defectSum === 0,
      };
      const roleVerdicts = {
        ordinaryUser: criteria.physicalPassport && databaseResources.length >= 5 && databaseResources.length <= 10,
        estimator: criteria.formulaIdentity && criteria.resourceIdentity && criteria.artifactParity,
        constructionEngineer: criteria.independentStaticOracle && criteria.canonicalDefinitionIdentity && criteria.successorMetadata,
      };
      invariant(Object.values(criteria).every(Boolean) && Object.values(roleVerdicts).every(Boolean),
        `BATCH004_CONTENT_CARD_RED:${row.catalog_id}:${JSON.stringify({ criteria, roleVerdicts })}`);
      const card = {
        contract: "real-professional-estimates-r5.6.batch004-content-acceptance-card.v1",
        catalogId: row.catalog_id,
        family: definition.family,
        operation: definition.operation,
        variant: definition.variant,
        definitionSha256: definition.definitionSha256,
        databaseDefinitionSha256: row.definition_sha256,
        engineeringSourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
        definitionVersionId: row.definition_version_id,
        finalRevisionId: proof.finalRevisionId,
        criteria,
        roleVerdicts,
        status: "GREEN_R56_BATCH004_CONTENT_ACCEPTED_ON_BACKEND_REPLAY",
      };
      return { ...card, payloadSha256: sha256(card) };
    });
    invariant(cards.length === 393, "BATCH004_CONTENT_CARD_DENOMINATOR_RED");
    const connectionRows = (await client.query(`select state,count(*)::integer count from pg_stat_activity
      where datname=current_database() and pid<>pg_backend_pid() group by state order by state`)).rows;
    invariant(connectionRows.length === 0, `BATCH004_CONTENT_CONNECTION_LEAK:${JSON.stringify(connectionRows)}`);
    const report = {
      contract: "real-professional-estimates-r5.6.batch004-content-acceptance.v1",
      status: "GREEN_R56_BATCH004_CONTENT_393_OF_393_BOUND_TO_BACKEND_NO_RELEASE",
      masterSha256: backend.masterSha256,
      backend: {
        path: BACKEND.replace(/\\/gu, "/"),
        sha256: sha256(readFileSync(BACKEND)),
        sourceStateId: backend.sourceStateId,
        definitionSetSha256: backend.definitionSetSha256,
        releaseId: backend.releaseId,
        searchReleaseId: backend.searchReleaseId,
        capabilityId: backend.capabilityId,
        counts: backend.counts,
      },
      staticReconciliation: {
        path: STATIC.replace(/\\/gu, "/"),
        sha256: sha256(readFileSync(STATIC)),
        sourceStateId: staticReport.sourceIdentity.sourceStateId,
        defectCounters: staticReport.defectCounters,
      },
      exactBackendSourceBytes: sourceBytes,
      denominators: {
        definitions: "393/393",
        contentCards: "393/393",
        roleVerdicts: "1179/1179",
        immutableRevisionChains: "393/393",
        pdfArtifacts: "393/393",
        procurementArtifacts: "393/393",
      },
      connectionAudit: {
        applicationName: "batch004-r56-content-binding",
        otherConnectionsDuringFinalAudit: 0,
        leakedConnectionsAfterBackendExit: 0,
        burstConnections: false,
      },
      cardsSha256: sha256(cards),
      releasePerformed: false,
      deployPerformed: false,
      otaPerformed: false,
      mergePerformed: false,
      pushPerformed: false,
      batch009Performed: false,
    };
    atomicWrite(CARDS, `${cards.map((card) => JSON.stringify(card)).join("\n")}\n`);
    atomicJson(OUTPUT, { ...report, payloadSha256: sha256(report) });
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      cards: cards.length,
      roleVerdicts: cards.length * 3,
      report: OUTPUT,
      reportSha256: sha256(readFileSync(OUTPUT)),
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
