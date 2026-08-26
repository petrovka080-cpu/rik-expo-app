import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(".");
const PROTECTED_ROOT = "C:/dev/rik-expo-app";
const MASTER =
  "C:/Users/User/Downloads/MASTER_TZ_R5_5_PRODUCTION_GRADE_AUTONOMOUS_CANONICAL_CODE_REAL_AUTH_DEVELOPER_REVIEW_TECHNOLOGICAL_ESTIMATES_GLOBAL_GREEN_RU (1).md";
const MASTER_SHA256 = "fc1061ea34be0a633898200a8f9de38dd694e6dc1e0aee393d89066177c8e6c6";
const P0_ADDENDUM =
  "C:/Users/User/.codex/attachments/017c0f0b-4579-471f-98cf-ca08532f65ce/pasted-text.txt";
const P0_ADDENDUM_SHA256 = "39a3c922715f4de7dcd93840acb4f770dc5fae51badd1b4dafab068893afa8a0";
const EVIDENCE = resolve(".release-runtime/r552/evidence");
const DRY_RUN_RECEIPT = resolve(
  ".release-runtime/r542/evidence/62_R542_RUSSIAN_CONTENT_SUCCESSOR.json",
);
const DRY_RUN_VERIFIER = resolve(
  ".release-runtime/r542/tools/verifyR542DryRunRollback.mjs",
);
const OLD_LOCK = resolve(".release-runtime/r542/runtime/r542-controller.lock.json");
const OLD_HEARTBEAT = resolve(
  ".release-runtime/r542/evidence/08_R542_CONTROLLER_HEARTBEAT.jsonl",
);
const SCHEMA = "rik-expo-app-r552.recovery.v1";

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

function atomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text, "utf8");
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

function run(command, args, cwd = ROOT) {
  return execFileSync(command, args, { cwd, encoding: "utf8" }).trim();
}

function git(cwd, args) {
  return run("git.exe", ["-C", cwd, ...args]);
}

function fileProof(path) {
  const bytes = readFileSync(path);
  return {
    path: resolve(path).replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function statusSnapshot(cwd) {
  const raw = execFileSync(
    "git.exe",
    ["-C", cwd, "status", "--porcelain=v1", "-z", "--untracked-files=all"],
  );
  const decoded = raw.toString("utf8");
  const records = decoded.split("\0").filter(Boolean);
  return {
    head: git(cwd, ["rev-parse", "HEAD"]),
    branch: git(cwd, ["branch", "--show-current"]),
    status_record_count: records.length,
    status_records: records,
    status_raw_sha256: sha256(raw),
    ownership: cwd === ROOT ? "current_master_worktree_preserve" : "protected_user_checkout_do_not_touch",
  };
}

function powershellJson(script) {
  const raw = run("powershell.exe", ["-NoProfile", "-Command", script]);
  return raw ? JSON.parse(raw) : [];
}

const masterProof = fileProof(MASTER);
if (masterProof.sha256 !== MASTER_SHA256) {
  throw new Error(`R552_MASTER_SHA_MISMATCH:${masterProof.sha256}`);
}
const masterText = readFileSync(MASTER, "utf8");
const masterLines = masterText.split(/\r?\n/u);
if (masterLines.at(-1) === "") masterLines.pop();
if (masterLines.length !== 2286 || masterProof.bytes !== 111973) {
  throw new Error(`R552_MASTER_SHAPE_MISMATCH:${masterLines.length}:${masterProof.bytes}`);
}
const addendumProof = fileProof(P0_ADDENDUM);
if (addendumProof.sha256 !== P0_ADDENDUM_SHA256) {
  throw new Error(`R552_P0_ADDENDUM_SHA_MISMATCH:${addendumProof.sha256}`);
}

const oldLock = JSON.parse(readFileSync(OLD_LOCK, "utf8"));
const heartbeatLines = readFileSync(OLD_HEARTBEAT, "utf8").trim().split(/\r?\n/u);
const oldHeartbeat = JSON.parse(heartbeatLines.at(-1));
const processSnapshot = powershellJson(
  "$ports=@(8081,8190,8765,54321,54322,54329,55432);" +
    "$listeners=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object{$ports -contains $_.LocalPort});" +
    "$rows=@($listeners|ForEach-Object{$p=Get-CimInstance Win32_Process -Filter \"ProcessId=$($_.OwningProcess)\" -ErrorAction SilentlyContinue;" +
    "[pscustomobject]@{port=$_.LocalPort;address=$_.LocalAddress;pid=$_.OwningProcess;name=$p.Name;commandLine=$p.CommandLine}});" +
    "$rows|Sort-Object port,pid|ConvertTo-Json -Compress",
);
const relevantProcesses = powershellJson(
  "$rows=@(Get-CimInstance Win32_Process|Where-Object{$_.CommandLine -and ($_.CommandLine -match 'r542Controller|r552Controller|startLocalDeveloperReview|serveCanonicalEstimateLocalR1|localDeveloperAuthBroker|expo.*bin.*cli')}|" +
    "Select-Object ProcessId,ParentProcessId,CreationDate,Name,CommandLine);$rows|ConvertTo-Json -Compress",
);

let identity = null;
try {
  identity = JSON.parse(
    run("node.exe", ["node_modules/tsx/dist/cli.mjs", "scripts/dev/printLocalDeveloperBuildIdentity.ts"]),
  );
} catch (error) {
  identity = { status: "UNAVAILABLE", reason: error instanceof Error ? error.message : String(error) };
}

const recovery = seal("01_R552_RECOVERY_SNAPSHOT.json", {
  status: "GREEN_R552_EXACT_RECOVERY_SNAPSHOT",
  master: { ...masterProof, content_lines: masterLines.length, version: "R5.5.2" },
  current_p0_addendum: {
    ...addendumProof,
    status: "CANONICAL_ESTIMATE_CREATE_AND_PDF_RED",
    acceptance_sequence: ["2/2", "10/10", "50/50"],
    auth_refresh_storm: "OBSERVED_RED",
  },
  current_worktree: statusSnapshot(ROOT),
  protected_checkout: statusSnapshot(PROTECTED_ROOT),
  source_identity_before_r552_handoff: identity,
  old_controller: {
    lock: oldLock,
    heartbeat: oldHeartbeat,
    heartbeat_file: fileProof(OLD_HEARTBEAT),
  },
  local_environment: {
    web_url: "http://localhost:8081",
    provider_url: "http://127.0.0.1:54321",
    provider_db_port: 54322,
    canonical_backend_url: "http://127.0.0.1:8765",
    auth_broker_url: "http://127.0.0.1:54329",
    proof_web_url: "http://127.0.0.1:8190",
    listeners: processSnapshot,
    relevant_processes: relevantProcesses,
    production: false,
  },
  prior_state_accepted_only_as_predecessor: {
    a7: "43/43",
    real_auth_rls: "25/25",
    provider_rpc: "3/3",
    web80_attempt_10: "80/80",
    final_successor_credit: false,
  },
  current_phase: "P0_P1_LOCAL_DEVELOPER_AND_CANONICAL_CATALOG",
  content_apply_authorized: false,
  android_authorized: false,
  source_freeze_authorized: false,
  production_accessed: false,
  deployed: false,
  merged: false,
  released: false,
  ota: false,
});

const dryRun = JSON.parse(readFileSync(DRY_RUN_RECEIPT, "utf8"));
const verifier = JSON.parse(run("node.exe", [DRY_RUN_VERIFIER]));
if (
  dryRun.status !== "GREEN_R542_RUSSIAN_CONTENT_SUCCESSOR_DRY_RUN_ROLLED_BACK" ||
  dryRun.writesApplied !== 0 ||
  dryRun.productionAccessed !== false ||
  verifier.status !== "GREEN_R542_DRY_RUN_ROLLBACK_NO_RESIDUE" ||
  verifier.counts?.active_writers !== 0
) {
  throw new Error("R552_PRIOR_DRY_RUN_ACCEPTANCE_RED");
}
const dryRunAcceptance = seal("02_R552_PRIOR_DRY_RUN_ACCEPTANCE.json", {
  status: "GREEN_R552_PRIOR_DRY_RUN_ACCEPTED_WITHOUT_RERUN",
  predecessor_receipt: fileProof(DRY_RUN_RECEIPT),
  predecessor_status: dryRun.status,
  successor: dryRun.successor,
  projection: dryRun.projection,
  counts: dryRun.counts,
  rollback_verification: verifier,
  rerun_performed: false,
  persistent_apply_performed: false,
  persistent_apply_authorized: false,
  active_writers: 0,
  production_accessed: false,
  deployed: false,
  merged: false,
  released: false,
  ota: false,
});

process.stdout.write(
  `${JSON.stringify({
    status: "GREEN_R552_RECOVERY_AND_DRY_RUN_ACCEPTANCE",
    recovery_payload_sha256: recovery.payload_sha256,
    dry_run_payload_sha256: dryRunAcceptance.payload_sha256,
    current_status_records: recovery.current_worktree.status_record_count,
    protected_status_records: recovery.protected_checkout.status_record_count,
  })}\n`,
);
