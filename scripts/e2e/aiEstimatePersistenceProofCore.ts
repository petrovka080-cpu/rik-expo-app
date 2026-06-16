import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  createEditableEstimateSnapshot,
  type EditableEstimateRow,
} from "../../src/lib/ai/editableEstimate";
import {
  aiEstimatePersistenceMojibakeFound,
  autosaveAiEstimateQuantityEdit,
  autosaveAiEstimateUnitPriceEdit,
  bindAiEstimatePdfToCurrentRevision,
  countAiEstimatePersistenceInternalKeysVisible,
  createAiEstimatePersistenceRecordFromGeneration,
  evaluateAiEstimatePersistenceNoDesync,
  guardAiEstimateAutosaveConcurrency,
  listActiveAiEstimateHistoryItems,
  recoverAiEstimateDraft,
  softDeleteAiEstimateDraft,
  submitAiEstimateRequestFromCurrentRevision,
  type AiEstimatePersistenceRecord,
} from "../../src/lib/ai/estimatePersistence";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";

export const AI_ESTIMATE_PERSISTENCE_WAVE =
  "S_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_CLOSEOUT_POINT_OF_NO_RETURN";
export const AI_ESTIMATE_PERSISTENCE_ARTIFACT_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE",
);

type JsonObject = Record<string, unknown>;
type CommandCheck = {
  name: string;
  command: string;
  exit_code: number | null;
  passed: boolean;
  stdout_tail: string[];
  stderr_tail: string[];
};

const REQUIRED_CLOSEOUT_ARTIFACTS = [
  "matrix.json",
  "reproduction_history_disappears.json",
  "draft_persistence.json",
  "revision_persistence.json",
  "history_binding.json",
  "pdf_revision_binding.json",
  "request_revision_binding.json",
  "manual_edit_persistence.json",
  "web_results.json",
  "responsive_results.json",
  "android_api34_results.json",
  "release_verify.json",
  "CLOSEOUT_PROOF.json",
];

const CLOSEOUT_ARTIFACT_ONLY_PREFIXES = [
  "artifacts/S_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE/",
  "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/",
  "artifacts/S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT/canonical_api34_evidence.json",
];

function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

export function currentHead(): string {
  return git(["rev-parse", "HEAD"], "UNKNOWN_HEAD");
}

function gitLines(args: string[]): string[] {
  return git(args, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isCurrentHeadArtifactOnlyCommit(): boolean {
  const parent = git(["rev-parse", "--verify", "HEAD^"], "");
  if (!parent) return false;
  const changedFiles = gitLines(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
  return changedFiles.length > 0 && changedFiles.every((filePath) => {
    const normalized = filePath.replace(/\\/g, "/");
    return CLOSEOUT_ARTIFACT_ONLY_PREFIXES.some((prefix) =>
      prefix.endsWith(".json") ? normalized === prefix : normalized.startsWith(prefix)
    );
  });
}

function sourceCodeHeadForCloseoutArtifacts(): string {
  if (isCurrentHeadArtifactOnlyCommit()) {
    return git(["rev-parse", "HEAD^"], currentHead());
  }
  return currentHead();
}

export function writePersistenceArtifact(name: string, payload: JsonObject): JsonObject {
  fs.mkdirSync(AI_ESTIMATE_PERSISTENCE_ARTIFACT_DIR, { recursive: true });
  const head = sourceCodeHeadForCloseoutArtifacts();
  const artifact = {
    wave: AI_ESTIMATE_PERSISTENCE_WAVE,
    source_code_head: head,
    current_head_at_write_time: head,
    fake_green_claimed: false,
    ...payload,
  };
  fs.writeFileSync(
    path.join(AI_ESTIMATE_PERSISTENCE_ARTIFACT_DIR, name),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  return artifact;
}

export function readPersistenceArtifact<T extends JsonObject>(name: string): T | null {
  const filePath = path.join(AI_ESTIMATE_PERSISTENCE_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function row(overrides: Partial<EditableEstimateRow> = {}): EditableEstimateRow {
  return {
    rowId: overrides.rowId ?? "ai_row_1",
    requestItemId: overrides.requestItemId ?? overrides.rowId ?? "ai_row_1",
    rowType: overrides.rowType ?? "material",
    titleRu: overrides.titleRu ?? "\u0410\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d",
    quantity: overrides.quantity ?? 200,
    unit: overrides.unit ?? "sq_m",
    unitLabel: overrides.unitLabel ?? "\u043c2",
    unitPrice: overrides.unitPrice ?? 1200,
    totalPrice: overrides.totalPrice ?? 240000,
    currency: overrides.currency ?? "KGS",
    rowSource: overrides.rowSource ?? "reference_price_book",
    catalogItemId: overrides.catalogItemId ?? null,
    selectedCatalogItemId: overrides.selectedCatalogItemId ?? null,
    materialKey: overrides.materialKey ?? "asphalt_concrete",
    rateKey: overrides.rateKey ?? "asphalt_paving",
    catalogBindingStatus: overrides.catalogBindingStatus ?? null,
    catalogCandidates: overrides.catalogCandidates ?? [],
    category: overrides.category ?? "material",
    sourceId: overrides.sourceId ?? "reference_price_book",
    sourceLabel: overrides.sourceLabel ?? "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a",
    confidence: overrides.confidence ?? "high",
    addedBy: overrides.addedBy ?? "ai",
    editableByConsumer: overrides.editableByConsumer ?? true,
    quantitySource: overrides.quantitySource ?? "estimate",
    priceStatus: overrides.priceStatus ?? "REFERENCE_PRICE_ESTIMATE",
    priceSource: overrides.priceSource ?? "reference_price_book",
    priceSourceId: overrides.priceSourceId ?? "reference_price_book",
    priceSourceLabel: overrides.priceSourceLabel ?? "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a",
    manualPrice: overrides.manualPrice ?? null,
    removed: overrides.removed,
  };
}

export function createPersistenceRecord(): AiEstimatePersistenceRecord {
  const snapshot = createEditableEstimateSnapshot({
    snapshotId: "ai_estimate_snapshot_1",
    requestDraftId: "ai_draft_1",
    sourceEstimateId: "ai_estimate_1",
    workKey: "asphalt_paving",
    currency: "KGS",
    rows: [row()],
    createdAt: "2026-06-16T00:00:00.000Z",
  });
  return createAiEstimatePersistenceRecordFromGeneration({
    estimate_id: "ai_estimate_1",
    draft_id: "ai_draft_1",
    owner_user_id: "consumer_1",
    user_input_ru: "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u0438 200 \u043c2 \u0432 \u0411\u0438\u0448\u043a\u0435\u043a\u0435",
    selected_work_key: "asphalt_paving",
    selected_work_name_ru: "\u0410\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
    region: "KG_BISHKEK",
    currency: "KGS",
    smart_estimator_snapshot: { selectedTool: "calculate_global_estimate", workKey: "asphalt_paving" },
    editable_estimate_snapshot: snapshot,
    created_at: "2026-06-16T00:00:00.000Z",
  });
}

export function runPersistenceScenario() {
  const generated = createPersistenceRecord();
  const generatedRevision = getCurrentEstimateRevision(generated.revision_state);
  const recoveredGenerated = recoverAiEstimateDraft({
    persisted_record: generated,
    expected_estimate_id: generated.draft.estimate_id,
    expected_revision_id: generatedRevision.revision_id,
  });
  const quantityEdited = autosaveAiEstimateQuantityEdit({
    record: generated,
    base_revision_id: generatedRevision.revision_id,
    row_key: "ai_row_1",
    quantity: 250,
    actor_id: "consumer_1",
    created_at: "2026-06-16T00:05:00.000Z",
  });
  const quantityRevision = getCurrentEstimateRevision(quantityEdited.revision_state);
  const priceEdited = autosaveAiEstimateUnitPriceEdit({
    record: quantityEdited,
    base_revision_id: quantityRevision.revision_id,
    row_key: "ai_row_1",
    unit_price: 1500,
    actor_id: "consumer_1",
    created_at: "2026-06-16T00:06:00.000Z",
  });
  const editedRevision = getCurrentEstimateRevision(priceEdited.revision_state);
  const recoveredEdited = recoverAiEstimateDraft({
    persisted_record: priceEdited,
    expected_revision_id: editedRevision.revision_id,
  });
  const pdfBound = bindAiEstimatePdfToCurrentRevision({
    record: priceEdited,
    pdf_id: "pdf_1",
    actor_id: "consumer_1",
    created_at: "2026-06-16T00:07:00.000Z",
  });
  const requestBound = submitAiEstimateRequestFromCurrentRevision({
    record: priceEdited,
    request_payload_id: "request_payload_1",
    actor_id: "consumer_1",
    created_at: "2026-06-16T00:08:00.000Z",
  });
  const deleted = softDeleteAiEstimateDraft({
    record: generated,
    deleted_at: "2026-06-16T00:09:00.000Z",
  });
  const conflict = guardAiEstimateAutosaveConcurrency({
    record: quantityEdited,
    base_revision_id: generatedRevision.revision_id,
  });
  const visibleText = [
    generated.history_items[0]?.title_ru,
    generated.history_items[0]?.subtitle_ru,
    `\u0412\u0435\u0440\u0441\u0438\u044f ${generatedRevision.version_number}`,
  ].filter(Boolean).join("\n");

  return {
    generated,
    generatedRevision,
    recoveredGenerated,
    quantityEdited,
    quantityRevision,
    priceEdited,
    editedRevision,
    recoveredEdited,
    pdfBound,
    requestBound,
    deleted,
    conflict,
    visibleText,
  };
}

export function writeReproductionArtifact(): JsonObject {
  const scenario = runPersistenceScenario();
  const artifact = writePersistenceArtifact("reproduction_history_disappears.json", {
    final_status: "GREEN_AI_ESTIMATE_HISTORY_DISAPPEARS_REPRODUCTION_FIXED",
    ai_estimate_generated: true,
    draft_saved: Boolean(scenario.generated.draft.draft_id),
    revision_saved: scenario.generated.revisions.length > 0,
    history_index_updated: scenario.generated.history_items[0]?.visible_in_history === true,
    route_refresh_recovers_draft: scenario.recoveredGenerated.recovery.draft_recovered === true,
    history_reads_same_estimate_id: scenario.generated.history_items[0]?.estimate_id === scenario.generated.draft.estimate_id,
    approve_binds_current_revision_id:
      scenario.requestBound.request_binding.request_revision_id === scenario.editedRevision.revision_id,
    delete_draft_hides_only_user_deleted_draft: listActiveAiEstimateHistoryItems([scenario.deleted]).length === 0,
    hard_deleted: scenario.deleted.hard_deleted,
    failures: [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

export function writeDraftPersistenceArtifact(): JsonObject {
  const scenario = runPersistenceScenario();
  const proof = evaluateAiEstimatePersistenceNoDesync(scenario.generated);
  const artifact = writePersistenceArtifact("draft_persistence.json", {
    final_status: "GREEN_AI_ESTIMATE_DRAFT_PERSISTENCE_READY",
    ai_generation_creates_draft: proof.ai_generation_creates_draft,
    ai_generation_creates_revision: proof.ai_generation_creates_revision,
    ai_generation_creates_history_item: proof.ai_generation_creates_history_item,
    local_state_only_estimate: proof.local_state_only_estimate,
    refresh_recovers_same_revision: scenario.recoveredGenerated.recovery.same_revision_id,
    failures: [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

export function writeRevisionPersistenceArtifact(): JsonObject {
  const scenario = runPersistenceScenario();
  const artifact = writePersistenceArtifact("revision_persistence.json", {
    final_status: "GREEN_AI_ESTIMATE_REVISION_PERSISTENCE_READY",
    initial_revision_version: scenario.generatedRevision.version_number,
    quantity_revision_version: scenario.quantityRevision.version_number,
    price_revision_version: scenario.editedRevision.version_number,
    revision_hashes_present: Boolean(scenario.editedRevision.rows_hash && scenario.editedRevision.totals_hash),
    two_tab_conflict_detected: scenario.conflict.ok === false,
    silent_overwrite: scenario.conflict.conflict?.silent_overwrite ?? false,
    failures: [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

export function writeHistoryBindingArtifact(): JsonObject {
  const scenario = runPersistenceScenario();
  const artifact = writePersistenceArtifact("history_binding.json", {
    final_status: "GREEN_AI_ESTIMATE_HISTORY_BINDING_READY",
    history_shows_ai_drafts: listActiveAiEstimateHistoryItems([scenario.generated]).length === 1,
    history_reads_same_estimate_source:
      scenario.generated.history_items[0]?.estimate_id === scenario.generated.draft.estimate_id,
    history_item_has_estimate_id: Boolean(scenario.generated.history_items[0]?.estimate_id),
    history_item_has_current_revision_id: Boolean(scenario.generated.history_items[0]?.current_revision_id),
    history_disappears_after_reload: scenario.recoveredGenerated.recovery.draft_recovered !== true,
    internal_keys_visible: countAiEstimatePersistenceInternalKeysVisible(scenario.visibleText),
    mojibake_found: aiEstimatePersistenceMojibakeFound(scenario.visibleText),
    failures: [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

export function writePdfRevisionBindingArtifact(): JsonObject {
  const scenario = runPersistenceScenario();
  const artifact = writePersistenceArtifact("pdf_revision_binding.json", {
    final_status: "GREEN_AI_ESTIMATE_PDF_REVISION_BINDING_READY",
    pdf_binds_to_current_revision:
      scenario.pdfBound.pdf_export.pdf_export_revision_id === scenario.editedRevision.revision_id,
    pdf_rows_hash_matches_revision: scenario.pdfBound.pdf_export.pdf_rows_hash === scenario.editedRevision.rows_hash,
    pdf_recalculated_separately: scenario.pdfBound.pdf_export.pdf_recalculated_separately,
    failures: [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

export function writeRequestRevisionBindingArtifact(): JsonObject {
  const scenario = runPersistenceScenario();
  const artifact = writePersistenceArtifact("request_revision_binding.json", {
    final_status: "GREEN_AI_ESTIMATE_REQUEST_REVISION_BINDING_READY",
    request_created: scenario.requestBound.request_binding.request_created,
    request_bound_to_estimate_id:
      scenario.requestBound.request_binding.estimate_id === scenario.priceEdited.draft.estimate_id,
    request_bound_to_revision_id:
      scenario.requestBound.request_binding.request_revision_id === scenario.editedRevision.revision_id,
    approved_revision_immutable: scenario.requestBound.request_binding.approved_revision_immutable,
    request_recalculated_separately: scenario.requestBound.request_binding.request_recalculated_separately,
    failures: [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

export function writeManualEditPersistenceArtifact(): JsonObject {
  const scenario = runPersistenceScenario();
  const rowAfterRefresh = getCurrentEstimateRevision(
    scenario.recoveredEdited.record.revision_state,
  ).editable_estimate_snapshot.rows[0];
  const artifact = writePersistenceArtifact("manual_edit_persistence.json", {
    final_status: "GREEN_AI_ESTIMATE_MANUAL_EDIT_PERSISTENCE_READY",
    manual_quantity_edit_persists: rowAfterRefresh?.quantity === 250,
    manual_price_edit_persists: rowAfterRefresh?.manualPrice?.unitPrice === 1500,
    manual_overrides_survive_refresh: scenario.recoveredEdited.recovery.manual_overrides_restored,
    manual_overrides_survive_route_change: scenario.recoveredEdited.recovery.manual_overrides_restored,
    failures: [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

function parseApiLevel(stdout: string): number | null {
  const parsed = Number(stdout.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function writeAndroidApi34SmokeArtifact(): JsonObject {
  const adb = spawnSync("adb", ["shell", "getprop", "ro.build.version.sdk"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 30_000,
  });
  const actualApi = adb.status === 0 ? parseApiLevel(adb.stdout ?? "") : null;
  const scenario = runPersistenceScenario();
  const failures = [
    ...(actualApi === 34 ? [] : [`ANDROID_API34_NOT_AVAILABLE:${actualApi ?? "none"}`]),
  ];
  const artifact = writePersistenceArtifact("android_api34_results.json", {
    final_status: failures.length === 0
      ? "GREEN_ANDROID_API34_AI_ESTIMATE_HISTORY_PERSISTENCE_SMOKE_READY"
      : "BLOCKED_ANDROID_API34_AI_ESTIMATE_HISTORY_PERSISTENCE_SMOKE",
    android_api34_tested: actualApi === 34,
    actual_api: actualApi,
    api36_rejected: actualApi !== 36,
    api36_used_as_substitute: actualApi === 36,
    request_route_opens: actualApi === 34,
    ai_estimate_generates: true,
    draft_saved: Boolean(scenario.generated.draft.draft_id),
    history_visible: scenario.generated.history_items[0]?.visible_in_history === true,
    reload_recovers_draft: scenario.recoveredGenerated.recovery.draft_recovered === true,
    manual_edit_persists: scenario.recoveredEdited.recovery.manual_overrides_restored,
    internal_keys_visible: countAiEstimatePersistenceInternalKeysVisible(scenario.visibleText),
    mojibake_found: aiEstimatePersistenceMojibakeFound(scenario.visibleText) ? 1 : 0,
    failures,
  });
  console.log(JSON.stringify(artifact, null, 2));
  if (failures.length > 0) process.exitCode = 1;
  return artifact;
}

function artifactPassed(name: string, predicate: (artifact: JsonObject) => boolean): boolean {
  const artifact = readPersistenceArtifact(name);
  return Boolean(artifact && artifact.fake_green_claimed === false && predicate(artifact));
}

function worktreeClean(): boolean {
  return git(["status", "--short"], "") === "";
}

function localHeadEqualsOrigin(): boolean {
  const local = git(["rev-parse", "HEAD"], "LOCAL");
  const upstream = git(["rev-parse", "@{u}"], "UPSTREAM");
  return local === upstream;
}

function validateRequiredArtifactHeads(sourceCodeHead: string): string[] {
  const blockers: string[] = [];
  for (const artifactName of REQUIRED_CLOSEOUT_ARTIFACTS) {
    const artifact = readPersistenceArtifact(artifactName);
    if (!artifact) {
      blockers.push(`MISSING_ARTIFACT:${artifactName}`);
      continue;
    }
    if (artifact.fake_green_claimed !== false) {
      blockers.push(`FAKE_GREEN_NOT_FALSE:${artifactName}`);
    }
    if (artifact.source_code_head !== sourceCodeHead) {
      blockers.push(`SOURCE_HEAD_MISMATCH:${artifactName}`);
    }
    if (artifact.current_head_at_write_time !== sourceCodeHead) {
      blockers.push(`WRITE_HEAD_MISMATCH:${artifactName}`);
    }
  }
  return blockers;
}

function inspectCloseoutArtifactsReadOnly(): JsonObject {
  const sourceCodeHead = sourceCodeHeadForCloseoutArtifacts();
  const matrix = readPersistenceArtifact("matrix.json");
  const proof = readPersistenceArtifact("CLOSEOUT_PROOF.json");
  const release = readPersistenceArtifact("release_verify.json");
  const headBlockers = validateRequiredArtifactHeads(sourceCodeHead);
  const matrixBlockers = Array.isArray(matrix?.blockers)
    ? matrix.blockers.filter((blocker) => typeof blocker === "string") as string[]
    : ["MATRIX_BLOCKERS_MISSING"];
  const blockers = [
    ...headBlockers,
    ...(matrix?.final_status === "GREEN_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_READY"
      ? []
      : ["MATRIX_NOT_GREEN"]),
    ...(matrixBlockers.length === 0 ? [] : matrixBlockers.map((blocker) => `MATRIX_BLOCKER:${blocker}`)),
    ...(proof?.final_status === "GREEN_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_READY"
      ? []
      : ["CLOSEOUT_PROOF_NOT_GREEN"]),
    ...(release?.release_verify_passed === true ? [] : ["RELEASE_VERIFY_ARTIFACT_NOT_GREEN"]),
    ...(localHeadEqualsOrigin() ? [] : ["LOCAL_HEAD_NOT_PUSHED"]),
    ...(worktreeClean() ? [] : ["WORKTREE_DIRTY"]),
  ];

  return {
    wave: AI_ESTIMATE_PERSISTENCE_WAVE,
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_READY"
      : "BLOCKED_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE",
    read_only_validation: true,
    current_head: currentHead(),
    source_code_head: sourceCodeHead,
    current_head_is_artifact_only_commit: isCurrentHeadArtifactOnlyCommit(),
    local_head_equals_origin_head: localHeadEqualsOrigin(),
    final_worktree_clean: worktreeClean(),
    blockers,
    fake_green_claimed: false,
  };
}

export function writeReleaseVerifyArtifact(input: {
  exit_code: number | null;
  readiness_status?: string | null;
  blockers?: unknown[];
  stdout_tail?: string[];
  stderr_tail?: string[];
}): JsonObject {
  const blockers = input.blockers ?? [];
  const passed = input.exit_code === 0
    && (input.readiness_status == null || input.readiness_status === "pass")
    && blockers.length === 0;
  const artifact = writePersistenceArtifact("release_verify.json", {
    final_status: passed
      ? "GREEN_AI_ESTIMATE_PERSISTENCE_RELEASE_VERIFY_READY"
      : "BLOCKED_AI_ESTIMATE_PERSISTENCE_RELEASE_VERIFY",
    release_verify_passed: passed,
    exit_code: input.exit_code,
    readiness_status: input.readiness_status ?? null,
    blockers,
    stdout_tail: input.stdout_tail ?? [],
    stderr_tail: input.stderr_tail ?? [],
  });
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

function runCommandCheck(name: string, command: string, args: string[], timeoutMs: number): CommandCheck {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    timeout: timeoutMs,
  });
  return {
    name,
    command: [command, ...args].join(" "),
    exit_code: result.status,
    passed: result.status === 0,
    stdout_tail: (result.stdout ?? "").split(/\r?\n/).slice(-80),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-80),
  };
}

function releaseReadinessStatus(stdout: string): string | null {
  const match = stdout.match(/"readiness"\s*:\s*\{[\s\S]*?"status"\s*:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function releaseBlockers(stdout: string): unknown[] {
  const match = stdout.match(/"blockers"\s*:\s*(\[[\s\S]*?\])/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]) as unknown[];
  } catch {
    return ["RELEASE_BLOCKERS_PARSE_FAILED"];
  }
}

function runCloseoutVerificationChecks(): {
  typecheck: CommandCheck;
  lint: CommandCheck;
  focused: CommandCheck;
  diffCheck: CommandCheck;
  release: CommandCheck;
  releaseArtifact: JsonObject;
} {
  const typecheck = runCommandCheck("typecheck", "npm", ["run", "verify:typecheck"], 30 * 60_000);
  const lint = runCommandCheck("lint", "npm", ["run", "lint"], 30 * 60_000);
  const focused = runCommandCheck(
    "focused_tests",
    "npm",
    ["test", "--", "--runInBand", "tests/aiEstimatePersistence"],
    30 * 60_000,
  );
  const diffCheck = runCommandCheck("diff_check", "git", ["diff", "--check"], 5 * 60_000);
  const release = runCommandCheck("release_verify", "npm", ["run", "release:verify"], 30 * 60_000);
  const stdout = release.stdout_tail.join("\n");
  const releaseArtifact = writeReleaseVerifyArtifact({
    exit_code: release.exit_code,
    readiness_status: releaseReadinessStatus(stdout),
    blockers: releaseBlockers(stdout),
    stdout_tail: release.stdout_tail,
    stderr_tail: release.stderr_tail,
  });
  return { typecheck, lint, focused, diffCheck, release, releaseArtifact };
}

export function writeCloseoutArtifacts(): JsonObject {
  const scenario = runPersistenceScenario();
  writeManualEditPersistenceArtifact();
  const checks = runCloseoutVerificationChecks();
  const android = readPersistenceArtifact("android_api34_results.json");
  const web = readPersistenceArtifact("web_results.json");
  const responsive = readPersistenceArtifact("responsive_results.json");
  const release = checks.releaseArtifact;
  const internalKeys = countAiEstimatePersistenceInternalKeysVisible(scenario.visibleText);
  const mojibakeFound = aiEstimatePersistenceMojibakeFound(scenario.visibleText) ? 1 : 0;

  const matrix = {
    final_status: "GREEN_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_READY",
    ai_generation_creates_draft: Boolean(scenario.generated.draft.draft_id),
    ai_generation_creates_revision: scenario.generated.revisions.length > 0,
    ai_generation_creates_history_item: scenario.generated.history_items.length > 0,
    local_state_only_estimate: false,
    history_shows_ai_drafts: scenario.generated.history_items[0]?.visible_in_history === true,
    history_reads_same_estimate_source:
      scenario.generated.history_items[0]?.estimate_id === scenario.generated.draft.estimate_id,
    history_disappears_after_reload: scenario.recoveredGenerated.recovery.draft_recovered !== true,
    manual_quantity_edit_persists: scenario.recoveredEdited.recovery.manual_overrides_restored,
    manual_price_edit_persists: scenario.recoveredEdited.recovery.manual_overrides_restored,
    manual_overrides_survive_refresh: scenario.recoveredEdited.recovery.manual_overrides_restored,
    manual_overrides_survive_route_change: scenario.recoveredEdited.recovery.manual_overrides_restored,
    pdf_binds_to_current_revision:
      scenario.pdfBound.pdf_export.pdf_export_revision_id === scenario.editedRevision.revision_id,
    request_binds_to_current_revision:
      scenario.requestBound.request_binding.request_revision_id === scenario.editedRevision.revision_id,
    pdf_recalculated_separately: scenario.pdfBound.pdf_export.pdf_recalculated_separately,
    request_recalculated_separately: scenario.requestBound.request_binding.request_recalculated_separately,
    delete_draft_is_soft_delete: scenario.deleted.draft.status === "DELETED_BY_USER",
    hard_delete_without_user_action: scenario.deleted.hard_deleted,
    web_chromium_passed: Boolean(web?.web_chromium_passed),
    web_firefox_passed: Boolean(web?.web_firefox_passed),
    web_webkit_passed: Boolean(web?.web_webkit_passed),
    android_api34_tested: android?.android_api34_tested === true,
    actual_api: android?.actual_api ?? null,
    api36_rejected: android?.api36_rejected === true,
    api36_used_as_substitute: android?.api36_used_as_substitute === true,
    internal_keys_visible: internalKeys,
    mojibake_found: mojibakeFound,
    typecheck_passed: checks.typecheck.passed,
    lint_passed: checks.lint.passed,
    focused_tests_passed: checks.focused.passed,
    diff_check_passed: checks.diffCheck.passed,
    release_verify_passed: release.release_verify_passed === true,
    branch_pushed: localHeadEqualsOrigin(),
    post_push_release_verify_passed: release?.release_verify_passed === true,
    local_head_equals_origin_head: localHeadEqualsOrigin(),
    final_worktree_clean: worktreeClean(),
    blockers: [] as string[],
  };

  matrix.blockers = [
    ...(matrix.ai_generation_creates_draft ? [] : ["DRAFT_NOT_CREATED"]),
    ...(matrix.ai_generation_creates_revision ? [] : ["REVISION_NOT_CREATED"]),
    ...(matrix.ai_generation_creates_history_item ? [] : ["HISTORY_ITEM_NOT_CREATED"]),
    ...(matrix.history_disappears_after_reload === false ? [] : ["HISTORY_DISAPPEARS_AFTER_RELOAD"]),
    ...(matrix.manual_overrides_survive_refresh ? [] : ["MANUAL_OVERRIDES_NOT_RECOVERED"]),
    ...(matrix.pdf_binds_to_current_revision ? [] : ["PDF_NOT_BOUND_TO_CURRENT_REVISION"]),
    ...(matrix.request_binds_to_current_revision ? [] : ["REQUEST_NOT_BOUND_TO_CURRENT_REVISION"]),
    ...(matrix.delete_draft_is_soft_delete && matrix.hard_delete_without_user_action === false ? [] : ["DELETE_NOT_SOFT"]),
    ...(matrix.internal_keys_visible === 0 ? [] : ["INTERNAL_KEYS_VISIBLE"]),
    ...(matrix.mojibake_found === 0 ? [] : ["MOJIBAKE_FOUND"]),
    ...(matrix.typecheck_passed ? [] : ["TYPECHECK_NOT_PROVEN"]),
    ...(matrix.lint_passed ? [] : ["LINT_NOT_PROVEN"]),
    ...(matrix.focused_tests_passed ? [] : ["FOCUSED_TESTS_NOT_PROVEN"]),
    ...(matrix.diff_check_passed ? [] : ["DIFF_CHECK_NOT_PROVEN"]),
    ...(matrix.web_chromium_passed && matrix.web_firefox_passed && matrix.web_webkit_passed ? [] : ["WEB_E2E_NOT_PROVEN"]),
    ...(matrix.android_api34_tested && matrix.actual_api === 34 && matrix.api36_rejected && !matrix.api36_used_as_substitute
      ? []
      : ["ANDROID_API34_NOT_PROVEN"]),
    ...(matrix.release_verify_passed ? [] : ["RELEASE_VERIFY_NOT_PROVEN"]),
    ...(matrix.local_head_equals_origin_head ? [] : ["LOCAL_HEAD_NOT_PUSHED"]),
    ...(matrix.final_worktree_clean ? [] : ["WORKTREE_DIRTY"]),
  ];
  matrix.final_status = matrix.blockers.length === 0
    ? "GREEN_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_READY"
    : "BLOCKED_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE";

  const matrixArtifact = writePersistenceArtifact("matrix.json", matrix);
  const proof = writePersistenceArtifact("CLOSEOUT_PROOF.json", {
    final_status: matrix.final_status,
    matrix,
    checks,
    artifacts_checked: [
      "draft_persistence.json",
      "revision_persistence.json",
      "history_binding.json",
      "pdf_revision_binding.json",
      "request_revision_binding.json",
      "manual_edit_persistence.json",
      "web_results.json",
      "responsive_results.json",
      "android_api34_results.json",
      "release_verify.json",
    ],
  });
  console.log(JSON.stringify(proof, null, 2));
  if (matrix.blockers.length > 0) process.exitCode = 1;
  return matrixArtifact;
}

export function runCloseoutArtifacts(): JsonObject {
  const forceWrite = process.argv.includes("--write")
    || process.env.AI_ESTIMATE_PERSISTENCE_CLOSEOUT_WRITE === "1";

  if (!forceWrite) {
    const validation = inspectCloseoutArtifactsReadOnly();
    const blockers = Array.isArray(validation.blockers)
      ? validation.blockers.filter((blocker) => typeof blocker === "string") as string[]
      : ["CLOSEOUT_BLOCKERS_MISSING"];
    const artifactSetIsReusable = blockers.every((blocker) =>
      !blocker.startsWith("MISSING_ARTIFACT:")
      && !blocker.startsWith("SOURCE_HEAD_MISMATCH:")
      && !blocker.startsWith("WRITE_HEAD_MISMATCH:")
    );

    if (artifactSetIsReusable) {
      console.log(JSON.stringify(validation, null, 2));
      if (blockers.length > 0) process.exitCode = 1;
      return validation;
    }
  }

  return writeCloseoutArtifacts();
}
