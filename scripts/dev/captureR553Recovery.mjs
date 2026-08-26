import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(".");
const EXPECTED_ROOT = "C:/dev/rik-expo-app-p0-estimate-truth-remediation-r1";
const PROTECTED_ROOT = "C:/dev/rik-expo-app";
const MASTER =
  "C:/Users/User/Downloads/MASTER_TZ_R5_5_PRODUCTION_GRADE_AUTONOMOUS_CANONICAL_CODE_REAL_AUTH_DEVELOPER_REVIEW_TECHNOLOGICAL_ESTIMATES_GLOBAL_GREEN_RU (2).md";
const MASTER_SHA256 = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const OLD_MASTER_SHA256 = "fc1061ea34be0a633898200a8f9de38dd694e6dc1e0aee393d89066177c8e6c6";
const EVIDENCE = resolve(".release-runtime/r553/evidence");
const OLD_LOCK = resolve(".release-runtime/r552/runtime/r552-controller.lock.json");
const OLD_HEARTBEAT = resolve(
  ".release-runtime/r552/evidence/06_R552_CONTROLLER_HEARTBEAT.jsonl",
);
const OLD_DRY_RUN_ACCEPTANCE = resolve(
  ".release-runtime/r552/evidence/02_R552_PRIOR_DRY_RUN_ACCEPTANCE.json",
);
const SCHEMA = "rik-expo-app-r553.recovery.v1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
    .join(",")}}`;
}

function atomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function seal(name, payload) {
  const body = {
    schema_version: SCHEMA,
    captured_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    ...payload,
  };
  body.payload_sha256 = sha256(stable(body));
  atomic(resolve(EVIDENCE, name), `${JSON.stringify(body, null, 2)}\n`);
  return body;
}

function run(command, args, cwd = ROOT, encoding = "utf8") {
  return encoding === "buffer"
    ? execFileSync(command, args, { cwd, maxBuffer: 256 * 1024 * 1024 })
    : execFileSync(command, args, { cwd, encoding, maxBuffer: 256 * 1024 * 1024 });
}

function git(cwd, args, encoding = "utf8") {
  return run("git.exe", ["-C", cwd, ...args], cwd, encoding);
}

function fileProof(path) {
  const bytes = readFileSync(path);
  return {
    path: resolve(path).replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function parseStatus(raw) {
  return raw
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const status = record.slice(0, 2);
      const path = record.slice(3).replaceAll("\\", "/");
      return {
        status,
        path,
        owner_scope: "CURRENT_MASTER_WORKTREE_PRESERVE",
        origin_author: "UNKNOWN_DO_NOT_OVERWRITE",
        reachable_from_git_index: status !== "??",
        reachable_from_head: false,
      };
    });
}

function statusSnapshot(cwd, ownership) {
  const allRaw = git(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], "buffer");
  const normalRaw = git(
    cwd,
    ["status", "--porcelain=v1", "-z", "--untracked-files=normal"],
    "buffer",
  );
  const records = parseStatus(allRaw);
  const headPaths = new Set(
    git(cwd, ["ls-tree", "-r", "--name-only", "HEAD"])
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((path) => path.replaceAll("\\", "/")),
  );
  for (const record of records) record.reachable_from_head = headPaths.has(record.path);
  const trackedRecords = records.filter((record) => record.status !== "??");
  const untrackedRecords = records.filter((record) => record.status === "??");
  const diff = git(cwd, ["diff", "--binary"], "buffer");
  const cachedDiff = git(cwd, ["diff", "--cached", "--binary"], "buffer");
  const disk = statfsSync(cwd);
  return {
    root: resolve(cwd).replaceAll("\\", "/"),
    ownership,
    head: git(cwd, ["rev-parse", "HEAD"]).trim(),
    branch: git(cwd, ["branch", "--show-current"]).trim(),
    head_tree: git(cwd, ["rev-parse", "HEAD^{tree}"]).trim(),
    index_tree: git(cwd, ["write-tree"]).trim(),
    aggregate_status_record_count: parseStatus(normalRaw).length,
    expanded_status_record_count: records.length,
    tracked_changed_count: trackedRecords.length,
    untracked_file_count: untrackedRecords.length,
    status_raw_sha256: sha256(allRaw),
    status_records: records,
    tracked_diff: {
      bytes: diff.length,
      sha256: sha256(diff),
      cached_bytes: cachedDiff.length,
      cached_sha256: sha256(cachedDiff),
      numstat: git(cwd, ["diff", "--numstat"]).trim().split(/\r?\n/u).filter(Boolean),
      name_status: git(cwd, ["diff", "--name-status"]).trim().split(/\r?\n/u).filter(Boolean),
    },
    free_bytes: Number(disk.bavail) * Number(disk.bsize),
    preserve_all_changes: true,
  };
}

function powershellJson(script) {
  const raw = run("powershell.exe", ["-NoProfile", "-Command", script]).trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

if (ROOT.replaceAll("\\", "/") !== EXPECTED_ROOT) {
  throw new Error(`R553_WRONG_WORKTREE:${ROOT}`);
}
if (!existsSync(MASTER) || lstatSync(MASTER).isDirectory()) throw new Error("R553_MASTER_MISSING");
const masterProof = fileProof(MASTER);
if (masterProof.sha256 !== MASTER_SHA256 || masterProof.bytes !== 155_132) {
  throw new Error(`R553_MASTER_IDENTITY_RED:${masterProof.bytes}:${masterProof.sha256}`);
}
const masterText = readFileSync(MASTER, "utf8");
const masterLines = masterText.split(/\r?\n/u);
if (masterLines.at(-1) === "") masterLines.pop();
if (masterLines.length !== 2_720) {
  throw new Error(`R553_MASTER_LINES_RED:${masterLines.length}`);
}

const oldLock = JSON.parse(readFileSync(OLD_LOCK, "utf8"));
const oldHeartbeat = JSON.parse(readFileSync(OLD_HEARTBEAT, "utf8").trim().split(/\r?\n/u).at(-1));
if (
  oldLock.master_sha256 !== OLD_MASTER_SHA256 ||
  oldHeartbeat.master_sha256 !== OLD_MASTER_SHA256 ||
  oldHeartbeat.controller_pid !== oldLock.pid
) {
  throw new Error("R553_PREDECESSOR_CONTROLLER_IDENTITY_RED");
}

const listeners = powershellJson(
  "$ports=@(8081,8190,8765,54321,54322,54329,55432);" +
    "$rows=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object{$ports -contains $_.LocalPort}|ForEach-Object{" +
    "$p=Get-CimInstance Win32_Process -Filter \"ProcessId=$($_.OwningProcess)\" -ErrorAction SilentlyContinue;" +
    "[pscustomobject]@{port=$_.LocalPort;address=$_.LocalAddress;pid=$_.OwningProcess;name=$p.Name;commandLine=$p.CommandLine}});" +
    "$rows|Sort-Object port,pid|ConvertTo-Json -Compress",
);
const processes = powershellJson(
  "$rows=@(Get-CimInstance Win32_Process|Where-Object{$_.CommandLine -and ($_.CommandLine -match 'r552Controller|r553Controller|startLocalDeveloperReview|serveCanonicalEstimateLocalR1|localDeveloperAuthBroker|expo.*bin.*cli')}|" +
    "Select-Object ProcessId,ParentProcessId,CreationDate,Name,ExecutablePath,CommandLine);$rows|ConvertTo-Json -Compress",
);

const currentWorktree = statusSnapshot(ROOT, "AUTHORITATIVE_R553_WORKTREE_PRESERVE");
const protectedCheckout = statusSnapshot(PROTECTED_ROOT, "PROTECTED_USER_CHECKOUT_DO_NOT_TOUCH");
const recovery = seal("01_R553_RECOVERY_SNAPSHOT.json", {
  status: "GREEN_R553_EXACT_RECOVERY_SNAPSHOT",
  master: {
    ...masterProof,
    content_lines: masterLines.length,
    utf8_valid: true,
    version: "R5.5.3",
    read_to_eof: true,
    predecessor_master_controls_queue: false,
  },
  observed_before_r553_control_files: {
    aggregate_status_records: 382,
    expanded_status_records: 3012,
    basis: "read_only_git_status_immediately_before_r553_control_file_creation",
  },
  current_worktree: currentWorktree,
  protected_checkout: protectedCheckout,
  predecessor_controller: {
    lock: oldLock,
    heartbeat: oldHeartbeat,
    heartbeat_file: fileProof(OLD_HEARTBEAT),
    required_transition: "GRACEFUL_STOP_THEN_ARCHIVE_THEN_SINGLE_R553_START",
  },
  local_environment: {
    web_url: "http://localhost:8081",
    provider_url: "http://127.0.0.1:54321",
    provider_db_port: 54322,
    canonical_backend_url: "http://127.0.0.1:8765",
    auth_broker_url: "http://127.0.0.1:54329",
    proof_web_url: "http://127.0.0.1:8190",
    listeners,
    relevant_processes: processes,
    production: false,
  },
  initial_truth: {
    full_catalog_identity_manifest: "0/11610",
    active_search_documents: 3430,
    direct_search: { concrete: 227, water: 91, electrical: 49, asphalt: 0 },
    estimate_create_gate_a: "0/2",
    browser_role_matrix: "3/9_LAST_STRICT_PREDECESSOR",
    android: "0/13560",
    auth_event_storm: "RED_23_EVENTS_IN_30_SECONDS",
    global_status: "RED",
  },
  queue_start: "FULL_CATALOG_AND_ESTIMATE_CREATE_P0",
  content_apply_authorized: false,
  android_authorized: false,
  source_freeze_authorized: false,
  active_writers: 0,
  production_accessed: false,
  deployed: false,
  merged: false,
  released: false,
  ota: false,
});

const predecessorAcceptance = JSON.parse(readFileSync(OLD_DRY_RUN_ACCEPTANCE, "utf8"));
const counts = predecessorAcceptance.counts ?? {};
const residue = predecessorAcceptance.rollback_verification?.counts ?? {};
if (
  predecessorAcceptance.master_sha256 !== OLD_MASTER_SHA256 ||
  predecessorAcceptance.status !== "GREEN_R552_PRIOR_DRY_RUN_ACCEPTED_WITHOUT_RERUN" ||
  counts.definitions !== 3322 ||
  counts.parameters !== 495632 ||
  counts.formulas !== 707582 ||
  counts.resources !== 707522 ||
  Object.values(residue).some((value) => value !== 0) ||
  predecessorAcceptance.rerun_performed !== false ||
  predecessorAcceptance.persistent_apply_performed !== false
) {
  throw new Error("R553_PREDECESSOR_DRY_RUN_ACCEPTANCE_RED");
}
const dryRunAcceptance = seal("02_R553_PRIOR_DRY_RUN_ACCEPTANCE.json", {
  status: "GREEN_R553_PREDECESSOR_DRY_RUN_ACCEPTED_WITHOUT_RERUN",
  predecessor_acceptance: fileProof(OLD_DRY_RUN_ACCEPTANCE),
  counts,
  search: {
    documents: counts.search_documents,
    groups: counts.search_groups,
    memberships: counts.search_memberships,
  },
  raw_english_resources: counts.raw_english_resources,
  rollback_residue: residue,
  rerun_performed: false,
  persistent_apply_performed: false,
  active_writers: 0,
  production_accessed: false,
  deployed: false,
  merged: false,
  released: false,
  ota: false,
});

process.stdout.write(
  `${JSON.stringify({
    status: "GREEN_R553_RECOVERY_AND_DRY_RUN_ACCEPTANCE",
    recovery_payload_sha256: recovery.payload_sha256,
    dry_run_payload_sha256: dryRunAcceptance.payload_sha256,
    current_aggregate_status_records: currentWorktree.aggregate_status_record_count,
    current_expanded_status_records: currentWorktree.expanded_status_record_count,
    protected_status_records: protectedCheckout.expanded_status_record_count,
  })}\n`,
);
