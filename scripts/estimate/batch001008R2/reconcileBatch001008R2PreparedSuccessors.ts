import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-professional-estimates-r2.prepared-successor-checkpoint.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R1_RU (1).md");
const MASTER_SPEC_SHA256 = "b9373689e495a8d7e0883818371022eb792800baf10d19340f50c1aace08d986";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const AUDITED_RELEASE_ID = "4c5affaf-5f63-5d04-b036-875c684f8c45";
const SEARCH_RELEASE_ID = "367c2439-df83-5f27-bedd-89247b50caae";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const ROOT = resolve(".release-runtime/real-professional-estimates-r2");
const AUDIT_PATH = resolve(ROOT, "evidence/02-static-audit/batch001_008_content_audit.jsonl");
const SUMMARY_PATH = resolve(ROOT, "evidence/02-static-audit/batch001_008_content_audit_summary.json");
const STATE_PATH = resolve(ROOT, "state/batch001_008_r2_state.json");
const OUTPUT_PATH = resolve(ROOT, "evidence/03-successor/BATCH001_008_PREPARED_SUCCESSOR_CHECKPOINT.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256Buffer(readFileSync(path));
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(stable(value)), "utf8"));
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function main(): Promise<void> {
  invariant(existsSync(MASTER_SPEC_PATH) && sha256File(MASTER_SPEC_PATH) === MASTER_SPEC_SHA256,
    "R2_SUCCESSOR_CHECKPOINT_MASTER_DRIFT");
  for (const path of [AUDIT_PATH, SUMMARY_PATH, STATE_PATH]) {
    invariant(existsSync(path), `R2_SUCCESSOR_CHECKPOINT_INPUT_MISSING:${path}`);
  }

  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch001-008-r2-successor-checkpoint-readonly" });
  await client.connect();
  let active: Json;
  let search: Json;
  let successors: Json[];
  let changes: Json[];
  try {
    await client.query("begin transaction read only");
    active = (await client.query(`select id::text,status,activated_at,definition_count from public.estimate_definition_release where id=$1`, [ACTIVE_RELEASE_ID])).rows[0] as Json;
    search = (await client.query(`select id::text,status,activated_at,global_count from public.estimate_search_index_release where id=$1`, [SEARCH_RELEASE_ID])).rows[0] as Json;
    successors = (await client.query(`select r.id::text,r.release_key,r.status,r.parent_release_id::text,r.definition_count,
      r.parameter_count,r.formula_count,r.resource_row_count,r.sealed_at,r.activated_at,r.metadata,
      (select count(*)::int from public.estimate_cumulative_manifest_entry m where m.release_id=r.id) manifest_count,
      (select count(*)::int from public.estimate_revision v where v.release_id=r.id) revision_count,
      (select count(*)::int from public.estimate_revision_artifact a join public.estimate_revision v on v.id=a.revision_id where v.release_id=r.id) artifact_count
      from public.estimate_definition_release r
      where r.release_key like 'real-professional-estimates-r2-%' order by r.created_at,r.id`, [])).rows as Json[];
    changes = (await client.query(`select child.release_id::text successor_release_id,
      release.release_key,release.parent_release_id::text predecessor_release_id,
      child.catalog_id,child.domain_id,child.definition_version_id::text successor_definition_version_id,
      parent.definition_version_id::text predecessor_definition_version_id,
      child.approved_template_baseline_id::text successor_baseline_id,
      parent.approved_template_baseline_id::text predecessor_baseline_id,
      child.baseline_ready,child.scenario_ready
      from public.estimate_definition_release release
      join public.estimate_cumulative_manifest_entry child on child.release_id=release.id
      left join public.estimate_cumulative_manifest_entry parent
        on parent.release_id=release.parent_release_id and parent.catalog_id=child.catalog_id
      where release.release_key like 'real-professional-estimates-r2-%'
        and child.definition_version_id is distinct from parent.definition_version_id
      order by release.created_at,child.catalog_id`, [])).rows as Json[];
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  invariant(active?.status === "active" && active.id === ACTIVE_RELEASE_ID, "R2_SUCCESSOR_CHECKPOINT_ACTIVE_DRIFT");
  invariant(search?.id === SEARCH_RELEASE_ID, "R2_SUCCESSOR_CHECKPOINT_SEARCH_DRIFT");
  invariant(successors.length > 0, "R2_SUCCESSOR_CHECKPOINT_NO_PREPARED_SUCCESSOR");
  for (const successor of successors) {
    invariant(successor.status === "prepared" && successor.activated_at == null,
      `R2_SUCCESSOR_CHECKPOINT_LIFECYCLE_DRIFT:${successor.id}`);
    invariant(Number(successor.definition_count) === 4_282 && Number(successor.manifest_count) === 4_282,
      `R2_SUCCESSOR_CHECKPOINT_DENOMINATOR_DRIFT:${successor.id}`);
    invariant(Number(successor.revision_count) === 0 && Number(successor.artifact_count) === 0,
      `R2_SUCCESSOR_CHECKPOINT_HISTORY_MUTATION:${successor.id}`);
  }
  invariant(changes.length === successors.length,
    `R2_SUCCESSOR_CHECKPOINT_EXPECTED_ONE_CHANGE_PER_RELEASE:${changes.length}:${successors.length}`);

  const auditRows = readFileSync(AUDIT_PATH, "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line) as Json);
  invariant(auditRows.length === 4_282, `R2_SUCCESSOR_CHECKPOINT_AUDIT_DENOMINATOR:${auditRows.length}`);
  const changesByCatalog = new Map(changes.map((row) => [String(row.catalog_id), row]));
  let reconciled = 0;
  for (const row of auditRows) {
    const change = changesByCatalog.get(String(row.catalogId));
    if (!change) continue;
    invariant(row.currentVersionId === change.predecessor_definition_version_id,
      `R2_SUCCESSOR_CHECKPOINT_PREDECESSOR_DRIFT:${row.catalogId}`);
    row.successorVersionId = change.successor_definition_version_id;
    row.finalStatus = "RED";
    reconciled += 1;
  }
  invariant(reconciled === changes.length, `R2_SUCCESSOR_CHECKPOINT_RECONCILED:${reconciled}:${changes.length}`);
  atomicWrite(AUDIT_PATH, `${auditRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = JSON.parse(readFileSync(SUMMARY_PATH, "utf8")) as Json;
  delete summary.payloadSha256;
  summary.generatedAt = new Date().toISOString();
  summary.successorCheckpoint = {
    preparedReleaseCount: successors.length,
    preparedDefinitionCount: changes.length,
    successorCatalogIds: changes.map((row) => row.catalog_id),
    finalGreenCount: 0,
  };
  summary.payloadSha256 = sha256(summary);
  writeJson(SUMMARY_PATH, summary);

  const checkpointPayload = {
    contract: CONTRACT,
    capturedAt: new Date().toISOString(),
    masterSpecSha256: MASTER_SPEC_SHA256,
    auditedReleaseId: AUDITED_RELEASE_ID,
    activeRelease: active,
    searchRelease: search,
    preparedSuccessors: successors,
    changes,
    invariants: {
      activeReleaseSwitched: false,
      searchCutover: false,
      runtimeSwitched: false,
      successorRevisionsCreated: 0,
      successorArtifactsCreated: 0,
      historicalRowsMutated: 0,
      auditRowsReconciled: reconciled,
    },
    status: "GREEN_PREPARED_SUCCESSOR_CHECKPOINT_NOT_ACTIVE_R2_OVERALL_RED",
  };
  const checkpoint = { ...checkpointPayload, payloadSha256: sha256(checkpointPayload) };
  writeJson(OUTPUT_PATH, checkpoint);

  const state = JSON.parse(readFileSync(STATE_PATH, "utf8")) as Json;
  const updatedAt = new Date().toISOString();
  state.currentStage = "SUCCESSOR_BUILD";
  state.updatedAt = updatedAt;
  state.stages.ADJUDICATION = { status: "IN_PROGRESS", updatedAt };
  state.stages.SUCCESSOR_BUILD = {
    status: "IN_PROGRESS",
    updatedAt,
    preparedDefinitions: changes.length,
    evidence: [OUTPUT_PATH.replaceAll("\\", "/")],
  };
  state.lastCheckpoint = {
    ...(state.lastCheckpoint ?? {}),
    preparedSuccessors: changes.length,
    successorCheckpointSha256: checkpoint.payloadSha256,
    summarySha256: summary.payloadSha256,
  };
  writeJson(STATE_PATH, state);

  process.stdout.write(`${JSON.stringify({
    outputPath: OUTPUT_PATH,
    preparedReleases: successors.length,
    reconciledDefinitions: reconciled,
    activeReleaseSwitched: false,
    searchCutover: false,
    overallStatus: "RED_REMEDIATION_CONTINUES",
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
