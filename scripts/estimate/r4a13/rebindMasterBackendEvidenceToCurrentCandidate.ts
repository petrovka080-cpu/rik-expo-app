import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "65ee326a-7cfc-54ea-bdfe-b5de969b0ec4";
const SEARCH_RELEASE_ID = process.env.R4A13_SEARCH_RELEASE_ID
  ?? "5d7fc97e-ee99-5f15-be4a-2e9d787a0e85";
const PREDECESSOR_EVIDENCE_PATH = resolve(process.env.R4A13_PREDECESSOR_BACKEND_EVIDENCE_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-backend-benchmarks-v30/master-backend-benchmarks.json");
const AUDIT_PATH = resolve(process.env.R4A13_AUDIT_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/catalog-minimum-input-audit-v60/catalog-first-estimate-audit.json");
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-backend-benchmarks-v31-rebind");
const OUTPUT = resolve(OUTPUT_ROOT, "master-backend-benchmarks.json");
const CONTRACT = "rik-expo-app.r4-a13-6.master-backend-candidate-rebind.v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`MASTER_BACKEND_REBIND:${code}`);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(pending, path);
}

async function main(): Promise<void> {
  const predecessorBytes = readFileSync(PREDECESSOR_EVIDENCE_PATH);
  const predecessor = JSON.parse(predecessorBytes.toString("utf8")) as Json;
  const auditBytes = readFileSync(AUDIT_PATH);
  const audit = JSON.parse(auditBytes.toString("utf8")) as Json;
  const benchmarks = predecessor.benchmarks as Json[];
  invariant(predecessor.status === "BACKEND_CONTENT_ACCEPTED_30_OF_30_WEB_ANDROID_OPEN",
    "PREDECESSOR_STATUS_RED");
  invariant(Array.isArray(benchmarks) && benchmarks.length === 30
    && new Set(benchmarks.map((entry) => Number(entry.ordinal))).size === 30,
  "PREDECESSOR_DENOMINATOR_RED");
  invariant(audit.candidate?.definitionReleaseId === RELEASE_ID
    && audit.candidate?.status === "prepared"
    && audit.candidate?.activatedAt == null
    && audit.denominator === 10_331
    && audit.counts?.minimumCompiled === 10_331
    && audit.counts?.minimumFailed === 0
    && audit.counts?.missingInternalProfessionalSource === 0
    && audit.counts?.refinedFixtureCompiledWithoutNeeds === 10_331
    && audit.releaseActivated === false,
  "CURRENT_AUDIT_RED");

  const catalogIds = benchmarks.map((entry) => String(entry.currentCatalogId));
  const outcomes = new Map((audit.outcomes as Json[]).map((entry) => [String(entry.catalogId), entry]));
  const client = new Client({ connectionString: DATABASE_URL,
    application_name: "r4-a13-6-master-backend-evidence-rebind" });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at
      from public.estimate_definition_release where id=$1`, [RELEASE_ID])).rows[0] as Json;
    const search = (await client.query(`select id::text,status,metadata
      from public.estimate_search_index_release where id=$1`, [SEARCH_RELEASE_ID])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "RELEASE_NOT_PREPARED_INACTIVE");
    invariant(search?.status === "draft"
      && search.metadata?.definitionReleaseId === RELEASE_ID,
    "SEARCH_NOT_DRAFT_FOR_RELEASE");
    const current = (await client.query(`select catalog_id,definition_version_id::text,source_batch,
        approved_template_baseline_id::text
      from public.estimate_cumulative_manifest_entry
      where release_id=$1 and catalog_id=any($2::text[])
      order by catalog_id`, [RELEASE_ID, catalogIds])).rows as Json[];
    invariant(current.length === 30, `CURRENT_MANIFEST_DENOMINATOR:${current.length}`);
    const currentByCatalog = new Map(current.map((entry) => [String(entry.catalog_id), entry]));

    const reboundBenchmarks = benchmarks.map((benchmark) => {
      const catalogId = String(benchmark.currentCatalogId);
      const manifest = currentByCatalog.get(catalogId);
      const outcome = outcomes.get(catalogId);
      invariant(manifest, `CURRENT_MANIFEST_MISSING:${catalogId}`);
      invariant(String(manifest.definition_version_id) === String(benchmark.currentDefinitionVersionId),
        `DEFINITION_CHANGED_REQUIRES_CONTENT_REACCEPTANCE:${catalogId}`);
      invariant(String(manifest.source_batch) === String(benchmark.currentSourceBatch),
        `SOURCE_BATCH_CHANGED_REQUIRES_CONTENT_REACCEPTANCE:${catalogId}`);
      invariant(outcome?.minimum?.status === "COMPILED"
        && outcome?.refinement?.status === "COMPILED"
        && outcome?.minimum?.professionalSourceMissingParameterIds?.length === 0,
      `CURRENT_AUDIT_OUTCOME_RED:${catalogId}`);
      return {
        ...benchmark,
        currentDefinitionVersionId: String(manifest.definition_version_id),
        currentSourceBatch: String(manifest.source_batch),
        backendContentAcceptanceStatus: "ACCEPTED_CURRENT_PREPARED_CANDIDATE",
        webAcceptanceStatus: "NOT_EVALUATED",
        androidAcceptanceStatus: "NOT_EVALUATED",
      };
    });

    const receipt = {
      schemaVersion: CONTRACT,
      generatedAt: new Date().toISOString(),
      status: "BACKEND_CONTENT_ACCEPTED_30_OF_30_WEB_ANDROID_OPEN",
      candidate: {
        definitionReleaseId: RELEASE_ID,
        searchReleaseId: SEARCH_RELEASE_ID,
        status: "prepared",
        activatedAt: null,
        auditPath: AUDIT_PATH.replaceAll("\\", "/"),
        auditSha256: sha256(auditBytes),
        auditReceiptSha256: String(audit.receiptSha256),
      },
      boundary: [
        "All thirty MASTER catalog IDs resolve to the same immutable definition-version and source-batch identities accepted by the predecessor backend evidence.",
        "The current 10,331-definition audit independently compiled every unchanged benchmark definition at minimum and refined-fixture scope and found zero managed professional-source gaps.",
        "This receipt rebinds unchanged backend content only; current Web and Android acceptance remain separate gates.",
      ],
      rebind: {
        predecessorEvidencePath: PREDECESSOR_EVIDENCE_PATH.replaceAll("\\", "/"),
        predecessorEvidenceSha256: sha256(predecessorBytes),
        predecessorReleaseId: String(predecessor.candidate.definitionReleaseId),
        unchangedDefinitionVersions: 30,
        unchangedSourceBatches: 30,
        currentAuditDefinitionsCompiled: 30,
      },
      counts: {
        masterBenchmarkDenominator: 30,
        backendContentAccepted: 30,
        webAccepted: 0,
        androidAccepted: 0,
        unchangedDefinitionVersions: 30,
        currentAuditDefinitionsCompiled: 30,
      },
      benchmarks: reboundBenchmarks,
      activationPerformed: false,
      deployPerformed: false,
      releasePerformed: false,
      mergePerformed: false,
      otaPerformed: false,
      productionAccessed: false,
    };
    const receiptSha256 = sha256(JSON.stringify(receipt));
    atomicJson(OUTPUT, { ...receipt, receiptSha256 });
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      counts: receipt.counts,
      output: OUTPUT,
      outputSha256: sha256(readFileSync(OUTPUT)),
      receiptSha256,
    })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
