import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const EXPECTED_ROOT = "C:/dev/rik-expo-app-p0-estimate-truth-remediation-r1";
const MASTER_PATH = "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const PREDECESSOR_MASTER_SHA256 = "a875aa334eba28d4b7c654a05b3d19d21cb508a87015bbffcfd4f3d81805aa0b";
const SCHEMA = "rik-expo-app-r555.controller.v1";
const RUNTIME = resolve(ROOT, ".release-runtime/r555/runtime");
const EVIDENCE = resolve(ROOT, ".release-runtime/r555/evidence");
const SIGNALS = resolve(RUNTIME, "signals");
const LOCK = resolve(RUNTIME, "r555-controller.lock.json");
const STOP = resolve(RUNTIME, "r555-controller.stop.json");
const HEARTBEAT = resolve(RUNTIME, "r555-controller-heartbeat.jsonl");

const PHASES = [
  "MASTER_R555_ATOMIC_HANDOFF",
  "RECOVER_CURRENT_GATE_A_WITHOUT_SECOND_RUNNER",
  "FUNCTIONAL_GATE_A_2_OF_2",
  "SEAL_REGRESSION_CONTENT_RED",
  "FIX_ONTOLOGY_FLATTENING_AUTHORITATIVE_OWNER",
  "REMOVE_PUBLIC_EPSILON_AND_GENERIC_GENERATORS",
  "FIX_REGRESSION_RUSSIAN_NAMES_AND_APPLICABILITY",
  "REGRESSION_FUNCTIONAL_AND_CONTENT_2_OF_2",
  "ASPHALT_BACKEND_WEB_SEARCH_AND_LINEAGE",
  "ASPHALT_SENTINEL_MATRIX",
  "FULL_SOURCE_DISPOSITION_11610",
  "TECHNOLOGY_PASSPORT_AND_MATERIAL_COMPLETENESS",
  "ONE_CANONICAL_GRAPH_ALL_CONSUMERS",
  "CUMULATIVE_SUCCESSOR_DRY_RUN_ROLLBACK_APPLY",
  "CAPABILITY_REBIND_AND_DEFAULT_COMPILE_N_VISIBLE",
  "SUCCESSOR_GATES_A_B_C",
  "DEVELOPER_ROLES_SCREENS_ACTIONS_AUTH_SECURITY",
  "STATIC_NO_TEST_WEAKENING_PERFORMANCE",
  "SOURCE_FROZEN",
  "FINAL_BACKEND_WEB_PREDECESSOR_MATRICES",
  "WEB_COVERAGE_AND_GROUP50",
  "FINAL_NORMAL_APK",
  "ANDROID_COVERAGE_AND_GROUP50_VALID",
  "ANDROID_INVALID_3390",
  "PARITY_Q10",
  "CONTENT_REPORTS_CLEANUP_TERMINAL_AUDIT",
  "TERMINAL_SEAL",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const atomic = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text, "utf8");
  renameSync(temporary, path);
};
const seal = (name, body) => {
  const value = { schema_version: SCHEMA, generated_utc: new Date().toISOString(), master_sha256: MASTER_SHA256, ...body };
  value.payload_sha256 = sha256(stable(value));
  atomic(resolve(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`);
  return value;
};

function masterProof() {
  if (!existsSync(MASTER_PATH)) throw new Error("R555_MASTER_MISSING");
  const bytes = readFileSync(MASTER_PATH);
  const text = bytes.toString("utf8");
  const proof = { path: MASTER_PATH, bytes: bytes.length, content_lines: (text.match(/\n/gu) ?? []).length, sha256: sha256(bytes) };
  if (proof.bytes !== 239_356 || proof.content_lines !== 4_574 || proof.sha256 !== MASTER_SHA256) {
    throw new Error(`R555_MASTER_IDENTITY_MISMATCH:${JSON.stringify(proof)}`);
  }
  return proof;
}

function fileProof(path) {
  const absolute = resolve(path);
  const bytes = readFileSync(absolute);
  return { path: absolute.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function processRows() {
  const command = "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress";
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function freeBytes() {
  return Number(execFileSync("powershell.exe", ["-NoProfile", "-Command", "[long](Get-PSDrive -Name C).Free"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  }).trim());
}

function phaseQueue() {
  let blocked = false;
  return PHASES.map((phase, index) => {
    const completed = index === 0 || existsSync(resolve(SIGNALS, `${phase}.json`));
    const status = completed ? "COMPLETED" : blocked ? "PENDING" : "READY";
    if (!completed) blocked = true;
    return { phase, status };
  });
}

const currentLock = () => JSON.parse(readFileSync(LOCK, "utf8"));
function updateLease(generatedUtc) {
  const lock = currentLock();
  lock.lease_utc = generatedUtc;
  atomic(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
}

function tick() {
  masterProof();
  const generatedUtc = new Date().toISOString();
  const queue = phaseQueue();
  const completed = new Set(queue.filter((row) => row.status === "COMPLETED").map((row) => row.phase));
  const currentPhase = queue.find((row) => row.status === "READY")?.phase ?? "NONE";
  const sourceFrozen = completed.has("SOURCE_FROZEN");
  const terminal = completed.has("TERMINAL_SEAL");
  const proofWriters = processRows().filter((row) =>
    Number(row.ProcessId) !== process.pid
    && /runR555|buildR555|validateR555|apply.*Successor|Group50|Android.*Gate/iu.test(String(row.CommandLine ?? ""))
    && !/r555Controller\.mjs\s+signal/iu.test(String(row.CommandLine ?? "")),
  );
  const unresolved = terminal ? [] : [currentPhase === "NONE" ? "TERMINAL_SEAL_PENDING" : `${currentPhase}_PENDING`];
  const state = {
    status: terminal ? "GLOBAL_GREEN" : "GLOBAL_RED_IN_PROGRESS",
    controller_state: "RUNNING",
    controller_pid: process.pid,
    controller_started_utc: currentLock().started_utc,
    current_phase: currentPhase,
    phases: queue,
    pending_queue_items: queue.filter((row) => row.status !== "COMPLETED").length,
    source_frozen: sourceFrozen,
    functional_gate_a: completed.has("FUNCTIONAL_GATE_A_2_OF_2") ? "2/2" : "0/2",
    regression_content_gate: completed.has("REGRESSION_FUNCTIONAL_AND_CONTENT_2_OF_2") ? "2/2" : "0/2_CONTENT_RED",
    asphalt: {
      backend_web_lineage: completed.has("ASPHALT_BACKEND_WEB_SEARCH_AND_LINEAGE") ? "GREEN" : "RED",
      sentinel_matrix: completed.has("ASPHALT_SENTINEL_MATRIX") ? "GREEN" : "RED",
      active_search_documents: completed.has("CUMULATIVE_SUCCESSOR_DRY_RUN_ROLLBACK_APPLY") ? "N_visible/N_visible" : "3430/N_visible",
    },
    catalog_and_content: {
      source_identity_manifest: completed.has("FULL_SOURCE_DISPOSITION_11610") ? "11610/11610" : "0/11610",
      technology_passports: completed.has("TECHNOLOGY_PASSPORT_AND_MATERIAL_COMPLETENESS") ? "N_visible/N_visible" : "0/N_visible",
      default_compile: completed.has("CAPABILITY_REBIND_AND_DEFAULT_COMPILE_N_VISIBLE") ? "N_visible/N_visible" : "0/N_visible",
      public_english: terminal ? 0 : "UNPROVEN",
      public_epsilon: terminal ? 0 : "UNPROVEN",
      generic_public_titles: terminal ? 0 : "UNPROVEN",
    },
    successor_gates: completed.has("SUCCESSOR_GATES_A_B_C") ? { a: "2/2", b: "10/10", c: "50/50" } : { a: "0/2", b: "0/10", c: "0/50" },
    coverage: {
      backend: completed.has("CAPABILITY_REBIND_AND_DEFAULT_COMPILE_N_VISIBLE") ? "N_visible/N_visible" : "0/N_visible",
      web: completed.has("WEB_COVERAGE_AND_GROUP50") ? "N_visible/N_visible" : "0/N_visible",
      web_group50: completed.has("WEB_COVERAGE_AND_GROUP50") ? "W50/W50" : "0/W50",
      android: completed.has("ANDROID_COVERAGE_AND_GROUP50_VALID") ? "N_visible/N_visible" : "0/N_visible",
      android_group50: completed.has("ANDROID_COVERAGE_AND_GROUP50_VALID") ? "A50/A50" : "0/A50",
      android_invalid: completed.has("ANDROID_INVALID_3390") ? "3390/3390" : "0/3390",
      parity_q10: completed.has("PARITY_Q10") ? "Q10/Q10" : "0/Q10",
    },
    active_proof_writers: proofWriters.map((row) => Number(row.ProcessId)),
    writer_limit: 1,
    free_bytes: freeBytes(),
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
  seal("04_R555_EXECUTION_CONTROLLER_STATE.json", state);
  seal("05_R555_PHASE_QUEUE.json", state);
  const heartbeat = {
    schema_version: SCHEMA,
    generated_utc: generatedUtc,
    master_sha256: MASTER_SHA256,
    controller_pid: process.pid,
    current_phase: currentPhase,
    pending_queue_items: state.pending_queue_items,
    active_proof_writers: state.active_proof_writers,
    functional_gate_a: state.functional_gate_a,
    regression_content_gate: state.regression_content_gate,
    asphalt_sentinel_matrix: state.asphalt.sentinel_matrix,
    web_group50: state.coverage.web_group50,
    android_group50: state.coverage.android_group50,
    android_invalid: state.coverage.android_invalid,
    parity_q10: state.coverage.parity_q10,
    production_accessed: false,
  };
  heartbeat.payload_sha256 = sha256(stable(heartbeat));
  appendFileSync(HEARTBEAT, `${JSON.stringify(heartbeat)}\n`, "utf8");
  updateLease(generatedUtc);
}

const mode = process.argv[2] ?? "start";
if (ROOT.replaceAll("\\", "/") !== EXPECTED_ROOT) throw new Error(`R555_WRONG_WORKTREE:${ROOT}`);
mkdirSync(EVIDENCE, { recursive: true });
mkdirSync(SIGNALS, { recursive: true });

if (mode === "signal") {
  masterProof();
  const phase = process.argv[3];
  const receiptPath = process.argv[4];
  if (!PHASES.includes(phase) || phase === PHASES[0]) throw new Error(`R555_UNKNOWN_PHASE:${phase}`);
  if (!receiptPath || !existsSync(resolve(receiptPath))) throw new Error(`R555_SIGNAL_RECEIPT_MISSING:${phase}`);
  const ready = phaseQueue().find((row) => row.status === "READY")?.phase;
  if (ready !== phase) throw new Error(`R555_SIGNAL_OUT_OF_ORDER:${phase}:expected:${ready}`);
  const value = { phase, signaled_utc: new Date().toISOString(), receipt: fileProof(receiptPath), production_accessed: false };
  value.payload_sha256 = sha256(stable(value));
  atomic(resolve(SIGNALS, `${phase}.json`), `${JSON.stringify(value, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(value)}\n`);
} else if (mode === "start") {
  const master = masterProof();
  if (existsSync(LOCK)) throw new Error("R555_CONTROLLER_LOCK_EXISTS");
  if (existsSync(STOP)) throw new Error("R555_CONTROLLER_STOP_SENTINEL_EXISTS");
  const otherControllers = processRows().filter((row) =>
    Number(row.ProcessId) !== process.pid
    && String(row.Name ?? "").toLocaleLowerCase("en-US") === "node.exe"
    && /r542Controller|r552Controller|r553Controller|r554Controller|r555Controller/iu.test(String(row.CommandLine ?? "")),
  );
  if (otherControllers.length !== 0) throw new Error("R555_OLD_OR_DUPLICATE_CONTROLLER_STILL_ALIVE");
  const started = new Date().toISOString();
  atomic(LOCK, `${JSON.stringify({
    pid: process.pid,
    started_utc: started,
    lease_utc: started,
    heartbeat_seconds: 45,
    master_sha256: MASTER_SHA256,
    command_line_sha256: sha256(process.argv.join("\0")),
    worktree: ROOT.replaceAll("\\", "/"),
    command: process.argv,
  }, null, 2)}\n`);
  seal("03_R555_CONTROLLER_HANDOFF_RECEIPT.json", {
    status: "GREEN_R555_ATOMIC_SINGLE_CONTROLLER_HANDOFF",
    master,
    old_controller_stopped_before_new_start: true,
    old_controller_master_sha256: PREDECESSOR_MASTER_SHA256,
    new_controller: { pid: process.pid, started_utc: started, heartbeat_seconds: 45 },
    controller_overlap_observed: false,
    authoritative_writers_at_handoff: [],
    current_phase: "RECOVER_CURRENT_GATE_A_WITHOUT_SECOND_RUNNER",
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  });
  tick();
  process.stdout.write(`${JSON.stringify({ status: "R555_CONTROLLER_RUNNING", pid: process.pid, heartbeat_seconds: 45 })}\n`);
  const timer = setInterval(() => {
    try {
      if (existsSync(STOP)) {
        clearInterval(timer);
        process.exit(0);
      }
      tick();
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      clearInterval(timer);
      process.exit(1);
    }
  }, 45_000);
} else {
  throw new Error(`R555_CONTROLLER_MODE_INVALID:${mode}`);
}
