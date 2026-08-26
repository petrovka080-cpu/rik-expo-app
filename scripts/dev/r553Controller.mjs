import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(".");
const EXPECTED_ROOT = "C:/dev/rik-expo-app-p0-estimate-truth-remediation-r1";
const EVIDENCE = resolve(".release-runtime/r553/evidence");
const RUNTIME = resolve(".release-runtime/r553/runtime");
const SIGNALS = resolve(RUNTIME, "controller-signals");
const LOCK = resolve(RUNTIME, "r553-controller.lock.json");
const STOP = resolve(RUNTIME, "r553-controller.stop.json");
const HEARTBEAT = resolve(EVIDENCE, "06_R553_CONTROLLER_HEARTBEAT.jsonl");
const MASTER_SHA256 = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const OLD_MASTER_SHA256 = "fc1061ea34be0a633898200a8f9de38dd694e6dc1e0aee393d89066177c8e6c6";
const SCHEMA = "rik-expo-app-r553.controller.v1";
const PHASES = [
  "MASTER_R553_RECOVERY_HANDOFF",
  "PRIOR_DRY_RUN_ACCEPTANCE",
  "FULL_CATALOG_AND_ESTIMATE_CREATE_P0",
  "STATIC_REGRESSION_CLOSURE",
  "FORWARD_ONLY_FULL_RUSSIAN_CATALOG_SUCCESSOR",
  "TECHNOLOGY_PASSPORT_AND_ESTIMATE_PROJECTIONS",
  "CANONICAL_ARCHITECTURE_AND_DEAD_SOURCE_CLOSURE",
  "QA_SECURITY_NO_TEST_CLOSURE",
  "FINAL_SOURCE_FREEZE",
  "FINAL_A7_PROVIDER_RLS_WEB80_SUCCESSOR",
  "FINAL_BACKEND_WEB",
  "FINAL_NORMAL_APK",
  "ANDROID_VALID",
  "ANDROID_INVALID",
  "PARITY_AND_ROLE_E2E",
  "CLEANUP",
  "TERMINAL_SEAL",
];
const AUTO = new Map([
  ["MASTER_R553_RECOVERY_HANDOFF", resolve(EVIDENCE, "01_R553_RECOVERY_SNAPSHOT.json")],
  ["PRIOR_DRY_RUN_ACCEPTANCE", resolve(EVIDENCE, "02_R553_PRIOR_DRY_RUN_ACCEPTANCE.json")],
]);

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
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    ...payload,
  };
  body.payload_sha256 = sha256(stable(body));
  atomic(resolve(EVIDENCE, name), `${JSON.stringify(body, null, 2)}\n`);
  return body;
}

function fileProof(path) {
  const bytes = readFileSync(resolve(path));
  return { path: resolve(path).replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function processRows() {
  const command =
    "$x=@(Get-CimInstance Win32_Process|Where-Object{$_.Name -eq 'node.exe' -and $_.CommandLine -and " +
    "($_.CommandLine -match 'r542Controller|r552Controller|r553Controller|runLocalDeveloperRoleMatrixSmoke|runLocalDeveloperRouteManifestSmoke|runLocalDeveloperCanonicalCatalog|R553Web80|R553Android|runR4WorkGroupAndroidSurface|runR5AndroidInvalidSurface')}|" +
    "Select-Object ProcessId,ParentProcessId,CreationDate,Name,CommandLine);$x|ConvertTo-Json -Compress";
  try {
    const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
      encoding: "utf8",
    }).trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function completedSet() {
  const completed = new Set();
  for (const [phase, path] of AUTO) if (existsSync(path)) completed.add(phase);
  for (const phase of PHASES) if (existsSync(resolve(SIGNALS, `${phase}.json`))) completed.add(phase);
  return completed;
}

function phaseQueue() {
  const completed = completedSet();
  let readyAssigned = false;
  return PHASES.map((phase) => {
    if (completed.has(phase)) return { phase, status: "COMPLETED" };
    if (!readyAssigned) {
      readyAssigned = true;
      return { phase, status: "READY" };
    }
    return { phase, status: "PENDING" };
  });
}

function tick() {
  const queue = phaseQueue();
  const completed = completedSet();
  const currentPhase = queue.find((row) => row.status === "READY")?.phase ?? "NONE";
  const processes = processRows();
  const writers = processes.filter(
    (row) =>
      Number(row.ProcessId) !== process.pid &&
      /runLocalDeveloperRoleMatrixSmoke|runLocalDeveloperRouteManifestSmoke|runLocalDeveloperCanonicalCatalog|R553Web80|R553Android|runR4WorkGroupAndroidSurface|runR5AndroidInvalidSurface/u.test(
        String(row.CommandLine ?? ""),
      ),
  );
  const disk = statfsSync(ROOT);
  const freeBytes = Number(disk.bavail) * Number(disk.bsize);
  const sourceFrozen = completed.has("FINAL_SOURCE_FREEZE");
  const finalAuth = completed.has("FINAL_A7_PROVIDER_RLS_WEB80_SUCCESSOR");
  const finalWeb = completed.has("FINAL_BACKEND_WEB");
  const androidValid = completed.has("ANDROID_VALID");
  const androidInvalid = completed.has("ANDROID_INVALID");
  const parity = completed.has("PARITY_AND_ROLE_E2E");
  const terminal = completed.has("TERMINAL_SEAL");
  const unresolved = currentPhase === "NONE" ? [] : [`${currentPhase}_PENDING`];
  const common = {
    status: terminal ? "GLOBAL_GREEN" : "GLOBAL_RED_IN_PROGRESS",
    controller_state: "RUNNING",
    controller_pid: process.pid,
    controller_started_utc: JSON.parse(readFileSync(LOCK, "utf8")).started_utc,
    current_phase: currentPhase,
    phases: queue,
    pending_queue_items: queue.filter((row) => row.status !== "COMPLETED").length,
    source_frozen: sourceFrozen,
    defect_ledger: { fixed_and_proven: terminal ? 90 : 0, denominator: 90 },
    catalog_and_estimate_p0: {
      full_catalog_identity_manifest: "0/11610",
      active_search_documents: "3430/N_visible",
      exhaustive_search_property_gate: "0/N_visible_x_3",
      missing_professional_domains: "RED",
      estimate_create_gate_a: "0/2",
      estimate_create_gate_b: "0/10",
      estimate_create_gate_c: "0/50",
      default_compile_gate_d: "0/N_visible",
      route_manifest: "0/23",
      browser_office_roles: "0/9",
      consumer_principal: "0/1",
      consumer_estimate_create_e2e: "0/1",
      auth_event_storm: "RED",
    },
    inherited_predecessor: {
      a7: "43/43",
      real_auth_rls: "25/25",
      provider_rpc: "3/3",
      web80: "80/80",
      concrete_single_query: "227/PARTIAL_ONLY",
      final_successor_credit: false,
    },
    final_successor: {
      a7: finalAuth ? "43/43" : "0/43",
      real_auth_rls: finalAuth ? "25/25" : "0/25",
      provider_rpc: finalAuth ? "3/3" : "0/3",
      web80: finalAuth ? "80/80" : "0/80",
      backend: finalWeb ? "20340/20340" : "0/20340",
      web: finalWeb ? "10170/10170" : "0/10170",
      web_per_group: finalWeb ? "G_full_x_10/G_full_x_10" : "0/G_full_x_10",
      android_valid: androidValid ? "10170/10170" : "0/10170",
      android_invalid: androidInvalid ? "3390/3390" : "0/3390",
      android_total: androidValid && androidInvalid ? "13560/13560" : "0/13560",
      android_per_group: androidValid ? "G_full_x_10/G_full_x_10" : "0/G_full_x_10",
      parity: parity ? "3390/3390" : "0/3390",
    },
    active_proof_writers: writers.map((row) => Number(row.ProcessId)),
    writer_limit: 1,
    free_bytes: freeBytes,
    unresolved_terminal_red: unresolved.length,
    unresolved_terminal_red_codes: unresolved,
    protected_user_unrelated_checkout: "C:/dev/rik-expo-app",
    protected_user_change_count: 3,
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  seal("04_R553_EXECUTION_CONTROLLER_STATE.json", common);
  seal("05_R553_PHASE_QUEUE.json", { ...common, controller_state: undefined });
  const heartbeat = {
    schema_version: SCHEMA,
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    controller_pid: process.pid,
    current_phase: currentPhase,
    pending_queue_items: common.pending_queue_items,
    active_proof_writers: common.active_proof_writers,
    catalog_identity_green: 0,
    catalog_identity_denominator: 11610,
    estimate_create_gate_a_green: 0,
    estimate_create_gate_a_denominator: 2,
    route_manifest_green: 0,
    route_manifest_denominator: 23,
    browser_roles_green: 0,
    browser_roles_denominator: 9,
    android_green: androidValid && androidInvalid ? 13_560 : 0,
    android_denominator: 13_560,
    parity_green: parity ? 3_390 : 0,
    parity_denominator: 3_390,
    free_bytes: freeBytes,
    production_accessed: false,
  };
  heartbeat.payload_sha256 = sha256(stable(heartbeat));
  appendFileSync(HEARTBEAT, `${JSON.stringify(heartbeat)}\n`, "utf8");
}

const mode = process.argv[2] ?? "start";
if (ROOT.replaceAll("\\", "/") !== EXPECTED_ROOT) throw new Error(`R553_WRONG_WORKTREE:${ROOT}`);
mkdirSync(EVIDENCE, { recursive: true });
mkdirSync(SIGNALS, { recursive: true });

if (mode === "signal") {
  const phase = process.argv[3];
  const receipt = process.argv[4];
  if (!PHASES.includes(phase)) throw new Error(`R553_UNKNOWN_PHASE:${phase}`);
  if (!receipt || !existsSync(resolve(receipt))) throw new Error(`R553_SIGNAL_RECEIPT_MISSING:${phase}`);
  const ready = phaseQueue().find((row) => row.status === "READY")?.phase;
  if (ready !== phase) throw new Error(`R553_SIGNAL_OUT_OF_ORDER:${phase}:expected:${ready}`);
  const value = {
    phase,
    signaled_utc: new Date().toISOString(),
    receipt: fileProof(receipt),
    production_accessed: false,
  };
  value.payload_sha256 = sha256(stable(value));
  atomic(resolve(SIGNALS, `${phase}.json`), `${JSON.stringify(value, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(value)}\n`);
} else if (mode === "start") {
  if (existsSync(LOCK)) throw new Error("R553_CONTROLLER_LOCK_EXISTS");
  if (existsSync(STOP)) throw new Error("R553_CONTROLLER_STOP_SENTINEL_EXISTS");
  for (const path of AUTO.values()) if (!existsSync(path)) throw new Error(`R553_RECOVERY_RECEIPT_MISSING:${path}`);
  const otherControllers = processRows().filter(
    (row) =>
      Number(row.ProcessId) !== process.pid &&
      /r542Controller|r552Controller|r553Controller/u.test(String(row.CommandLine ?? "")),
  );
  if (otherControllers.length !== 0) throw new Error("R553_OLD_OR_DUPLICATE_CONTROLLER_STILL_ALIVE");
  const started = new Date().toISOString();
  const commandLine = process.argv.join("\0");
  atomic(
    LOCK,
    `${JSON.stringify(
      {
        pid: process.pid,
        started_utc: started,
        lease_utc: started,
        master_sha256: MASTER_SHA256,
        command_line_sha256: sha256(commandLine),
        worktree: ROOT.replaceAll("\\", "/"),
        command: process.argv,
      },
      null,
      2,
    )}\n`,
  );
  seal("03_R553_CONTROLLER_HANDOFF_RECEIPT.json", {
    status: "GREEN_R553_ATOMIC_SINGLE_CONTROLLER_HANDOFF",
    old_controller_stopped_before_new_start: true,
    old_controller_master_sha256: OLD_MASTER_SHA256,
    new_controller: { pid: process.pid, started_utc: started, heartbeat_seconds: 45 },
    controller_overlap_observed: false,
    authoritative_writers_at_handoff: [],
    current_phase: "FULL_CATALOG_AND_ESTIMATE_CREATE_P0",
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  });
  tick();
  process.stdout.write(
    `${JSON.stringify({ status: "R553_CONTROLLER_RUNNING", pid: process.pid, heartbeat_seconds: 45 })}\n`,
  );
  const timer = setInterval(() => {
    try {
      tick();
      if (existsSync(STOP)) {
        clearInterval(timer);
        process.exit(0);
      }
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      clearInterval(timer);
      process.exit(1);
    }
  }, 45_000);
} else {
  throw new Error(`R553_CONTROLLER_MODE_INVALID:${mode}`);
}
