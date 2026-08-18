import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve("C:/Users/User/Downloads/ONE_CANONICAL_ESTIMATE_PRODUCTION_TZ_R6.md");
const SPEC_SHA256 = "4ffc00413c14458730823a90950b80d5191073e26f3bea4201f665953ed1eefa";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const BASELINE_RELEASE_ID = "a7dca174-3ad5-552b-aa4c-fc28979a56ef";
const CANDIDATE_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID
  ?? "4c5affaf-5f63-5d04-b036-875c684f8c45";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const SEMANTIC_LEDGER = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/13-r583/R583_PARAMETER_SEMANTIC_DEFECT_LEDGER.json",
);
const REPAIR_MATRIX = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const OUTPUT_ROOT = resolve(".release-runtime/one-canonical-estimate-r6/evidence/01-inventory");
const INVENTORY_OUTPUT = resolve(OUTPUT_ROOT, "RECONCILED_DEFINITION_INVENTORY.json");
const SURVIVAL_OUTPUT = resolve(OUTPUT_ROOT, "SURVIVAL_MATRIX.csv");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function csv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function countBy(rows: readonly Json[], key: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const value = String(row[key]);
    result[value] = (result[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

async function main(): Promise<void> {
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R6_INVENTORY_SPEC_DRIFT");
  invariant(sha256File(SEMANTIC_LEDGER).length === 64, "R6_INVENTORY_SEMANTIC_LEDGER_MISSING");
  invariant(sha256File(REPAIR_MATRIX).length === 64, "R6_INVENTORY_REPAIR_MATRIX_MISSING");

  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["show", "-s", "--format=%T", "HEAD"]);
  invariant(branch === EXPECTED_BRANCH, `R6_INVENTORY_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R6_INVENTORY_REQUIRES_CLEAN_HEAD");

  const semanticEvidence = JSON.parse(readFileSync(SEMANTIC_LEDGER, "utf8")) as Json;
  const semanticEntries = semanticEvidence.entries as Json[];
  invariant(Array.isArray(semanticEntries) && semanticEntries.length === 4_282,
    `R6_INVENTORY_SEMANTIC_DENOMINATOR:${semanticEntries?.length ?? -1}`);
  invariant(new Set(semanticEntries.map((row) => row.catalogId)).size === 4_282,
    "R6_INVENTORY_SEMANTIC_DUPLICATE_CATALOG");
  invariant(semanticEvidence.summary?.PROFESSIONAL_READY === 3_193
    && semanticEvidence.summary?.QUARANTINED === 1_089, "R6_INVENTORY_SEMANTIC_SUMMARY_DRIFT");
  const semanticByCatalog = new Map(semanticEntries.map((row) => [String(row.catalogId), row]));

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r6-reconciled-inventory-read-only" });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout='120s'");
    const releases = (await client.query(`
      select id::text,release_key,status,definition_count,source_commit,source_tree,parent_release_id::text,
        metadata
      from public.estimate_definition_release
      where id=any($1::uuid[])
      order by definition_count,id
    `, [[BASELINE_RELEASE_ID, CANDIDATE_RELEASE_ID]])).rows as Json[];
    invariant(releases.length === 2, `R6_INVENTORY_RELEASE_COUNT:${releases.length}`);
    const baselineRelease = releases.find((row) => row.id === BASELINE_RELEASE_ID);
    const candidateRelease = releases.find((row) => row.id === CANDIDATE_RELEASE_ID);
    invariant(baselineRelease?.status === "prepared" && Number(baselineRelease.definition_count) === 4_272,
      "R6_INVENTORY_BASELINE_RELEASE_DRIFT");
    invariant(candidateRelease?.status === "prepared" && Number(candidateRelease.definition_count) === 4_282,
      "R6_INVENTORY_CANDIDATE_RELEASE_DRIFT");

    const manifest = (await client.query(`
      select 'baseline' inventory_side,m.catalog_id,m.definition_version_id::text,m.source_batch,
        m.publication_state,m.domain_id,m.approved_template_baseline_id::text,m.baseline_ready,m.scenario_ready,
        v.definition_sha256,w.title_ru
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version v on v.id=m.definition_version_id
      join public.estimate_work_identity w on w.catalog_id=m.catalog_id
      where m.release_id=$1
      union all
      select 'candidate' inventory_side,m.catalog_id,m.definition_version_id::text,m.source_batch,
        m.publication_state,m.domain_id,m.approved_template_baseline_id::text,m.baseline_ready,m.scenario_ready,
        v.definition_sha256,w.title_ru
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version v on v.id=m.definition_version_id
      join public.estimate_work_identity w on w.catalog_id=m.catalog_id
      where m.release_id=$2
      order by inventory_side,catalog_id
    `, [BASELINE_RELEASE_ID, CANDIDATE_RELEASE_ID])).rows as Json[];
    await client.query("commit");

    const baseline = manifest.filter((row) => row.inventory_side === "baseline");
    const candidate = manifest.filter((row) => row.inventory_side === "candidate");
    invariant(baseline.length === 4_272 && new Set(baseline.map((row) => row.catalog_id)).size === 4_272,
      `R6_INVENTORY_BASELINE_MANIFEST:${baseline.length}`);
    invariant(candidate.length === 4_282 && new Set(candidate.map((row) => row.catalog_id)).size === 4_282,
      `R6_INVENTORY_CANDIDATE_MANIFEST:${candidate.length}`);
    invariant(candidate.every((row) => row.baseline_ready && row.scenario_ready && row.approved_template_baseline_id),
      "R6_INVENTORY_CANDIDATE_STRUCTURAL_READINESS_DRIFT");

    const baselineByCatalog = new Map(baseline.map((row) => [String(row.catalog_id), row]));
    const candidateByCatalog = new Map(candidate.map((row) => [String(row.catalog_id), row]));
    const missingCatalogs = baseline.filter((row) => !candidateByCatalog.has(String(row.catalog_id)));
    const additions = candidate.filter((row) => !baselineByCatalog.has(String(row.catalog_id)));
    invariant(missingCatalogs.length === 0, `R6_INVENTORY_ACCEPTED_CATALOG_LOSS:${missingCatalogs.length}`);
    invariant(additions.length === 10, `R6_INVENTORY_SUCCESSOR_ADDITIONS:${additions.length}`);

    const rows = candidate.map((candidateRow): Json => {
      const catalogId = String(candidateRow.catalog_id);
      const baselineRow = baselineByCatalog.get(catalogId) ?? null;
      const semantic = semanticByCatalog.get(catalogId);
      invariant(semantic, `R6_INVENTORY_SEMANTIC_ROW_MISSING:${catalogId}`);
      invariant(semantic.status === "PROFESSIONAL_READY" || semantic.status === "QUARANTINED",
        `R6_INVENTORY_UNKNOWN_DISPOSITION:${catalogId}:${semantic.status}`);
      const relation = !baselineRow
        ? "SUCCESSOR_ADDITION"
        : baselineRow.definition_version_id === candidateRow.definition_version_id
          ? "IDENTICAL_DEFINITION"
          : "FORWARD_SUCCESSOR";
      const inventoryDisposition = semantic.status === "PROFESSIONAL_READY" ? "CANONICAL" : "QUARANTINE";
      return {
        catalogId,
        titleRu: candidateRow.title_ru,
        domainId: candidateRow.domain_id,
        sourceBatch: candidateRow.source_batch,
        publicationState: candidateRow.publication_state,
        inventoryDisposition,
        admissionState: semantic.status,
        dispositionReason: semantic.dispositionReason,
        baselineDefinitionId: baselineRow?.definition_version_id ?? null,
        candidateDefinitionId: candidateRow.definition_version_id,
        definitionSha256: candidateRow.definition_sha256,
        approvedTemplateBaselineId: candidateRow.approved_template_baseline_id,
        baselineReady: candidateRow.baseline_ready,
        scenarioReady: candidateRow.scenario_ready,
        relation,
        preserved: true,
        selectable: inventoryDisposition === "CANONICAL",
      };
    }).sort((left, right) => String(left.catalogId).localeCompare(String(right.catalogId)));

    const relationCounts = countBy(rows, "relation");
    const dispositionCounts = countBy(rows, "inventoryDisposition");
    const admissionCounts = countBy(rows, "admissionState");
    invariant(relationCounts.IDENTICAL_DEFINITION === 4_271
      && relationCounts.FORWARD_SUCCESSOR === 1
      && relationCounts.SUCCESSOR_ADDITION === 10, `R6_INVENTORY_RELATION_COUNTS:${JSON.stringify(relationCounts)}`);
    invariant(dispositionCounts.CANONICAL === 3_193 && dispositionCounts.QUARANTINE === 1_089,
      `R6_INVENTORY_DISPOSITION_COUNTS:${JSON.stringify(dispositionCounts)}`);
    invariant(rows.filter((row) => row.relation === "SUCCESSOR_ADDITION" && row.admissionState === "PROFESSIONAL_READY").length === 10,
      "R6_INVENTORY_ADDITION_ADMISSION_DRIFT");
    invariant(rows.filter((row) => row.relation !== "SUCCESSOR_ADDITION" && row.admissionState === "PROFESSIONAL_READY").length === 3_183,
      "R6_INVENTORY_BASELINE_ACCEPTED_DENOMINATOR_DRIFT");

    const csvColumns = ["catalogId", "titleRu", "domainId", "sourceBatch", "publicationState",
      "inventoryDisposition", "admissionState", "dispositionReason", "baselineDefinitionId",
      "candidateDefinitionId", "definitionSha256", "approvedTemplateBaselineId", "relation", "preserved", "selectable"];
    const survivalCsv = `${csvColumns.join(",")}\n${rows.map((row) => csvColumns.map((column) => csv(row[column])).join(",")).join("\n")}\n`;
    mkdirSync(dirname(SURVIVAL_OUTPUT), { recursive: true });
    writeFileSync(SURVIVAL_OUTPUT, survivalCsv, "utf8");

    const inventory = {
      schemaVersion: "one-canonical-estimate-r6-reconciled-definition-inventory.v1",
      capturedAt: new Date().toISOString(),
      spec: { path: SPEC_PATH.replace(/\\/gu, "/"), sha256: SPEC_SHA256 },
      source: { branch, head, tree, clean: true },
      database: { name: "batch009_fire_r5_a", transaction: "READ_ONLY", writes: 0 },
      releases: { baseline: baselineRelease, candidate: candidateRelease },
      reconciliation: {
        reportedBaselineDefinitions: 4_272,
        reportedSuccessorDefinitions: 4_282,
        baselineCatalogIdentities: baseline.length,
        candidateCatalogIdentities: candidate.length,
        acceptedBaselineDefinitions: 3_183,
        acceptedSuccessorDefinitions: 3_193,
        preservedBaselineCatalogIdentities: 4_272,
        unchangedDefinitions: relationCounts.IDENTICAL_DEFINITION,
        forwardSuccessors: relationCounts.FORWARD_SUCCESSOR,
        successorAdditions: relationCounts.SUCCESSOR_ADDITION,
        unexplainedDrift: 0,
        acceptedDefinitionLoss: 0,
        equation: "4282 = 4272 - 0 lost catalog identities + 10 admitted successor additions",
        relationCounts,
        dispositionCounts: { ...dispositionCounts, ALIAS: 0 },
        admissionCounts,
        sourceBatchCounts: countBy(rows, "sourceBatch"),
      },
      evidenceInputs: {
        semanticLedger: { path: SEMANTIC_LEDGER.replace(/\\/gu, "/"), sha256: sha256File(SEMANTIC_LEDGER), rows: 4_282 },
        repairMatrix: { path: REPAIR_MATRIX.replace(/\\/gu, "/"), sha256: sha256File(REPAIR_MATRIX), rows: 4_272 },
      },
      survivalMatrix: {
        path: SURVIVAL_OUTPUT.replace(/\\/gu, "/"),
        rows: rows.length,
        bytes: Buffer.byteLength(survivalCsv),
        sha256: sha256(survivalCsv),
      },
      definitions: rows,
      activeReleaseSwitched: false,
      runtime8081Switched: false,
      terminalGreenClaimed: false,
      status: "GREEN_R6_RECONCILED_4282_4272_ZERO_UNEXPLAINED_DRIFT",
    };
    writeFileSync(INVENTORY_OUTPUT, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({
      ...inventory,
      definitions: `omitted:${rows.length}`,
    }, null, 2)}\n`);
  } catch (error) {
    try { await client.query("rollback"); } catch { /* connection may already be closed */ }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
