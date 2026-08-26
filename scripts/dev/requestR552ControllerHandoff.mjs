import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(".");
const OLD_LOCK = resolve(".release-runtime/r552/runtime/r552-controller.lock.json");
const OLD_STOP = resolve(".release-runtime/r552/runtime/r552-controller.stop.json");
const OLD_HEARTBEAT = resolve(
  ".release-runtime/r552/evidence/06_R552_CONTROLLER_HEARTBEAT.jsonl",
);
const NEW_MASTER_SHA256 = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const OLD_MASTER_SHA256 = "fc1061ea34be0a633898200a8f9de38dd694e6dc1e0aee393d89066177c8e6c6";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function atomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

if (existsSync(OLD_STOP)) throw new Error("R552_STOP_SENTINEL_ALREADY_EXISTS");
if (!existsSync(OLD_LOCK) || !existsSync(OLD_HEARTBEAT)) {
  throw new Error("R552_CONTROLLER_IDENTITY_FILES_MISSING");
}

const lock = JSON.parse(readFileSync(OLD_LOCK, "utf8"));
const heartbeat = JSON.parse(readFileSync(OLD_HEARTBEAT, "utf8").trim().split(/\r?\n/u).at(-1));
if (
  lock.master_sha256 !== OLD_MASTER_SHA256 ||
  heartbeat.master_sha256 !== OLD_MASTER_SHA256 ||
  heartbeat.controller_pid !== lock.pid ||
  String(lock.worktree).replaceAll("\\", "/") !== ROOT.replaceAll("\\", "/")
) {
  throw new Error("R552_CONTROLLER_IDENTITY_RED");
}

const heartbeatAgeMs = Date.now() - Date.parse(heartbeat.generated_utc);
if (!Number.isFinite(heartbeatAgeMs) || heartbeatAgeMs < 0 || heartbeatAgeMs > 120_000) {
  throw new Error(`R552_HEARTBEAT_STALE:${heartbeatAgeMs}`);
}

const processJson = execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-Command",
    `$p=Get-CimInstance Win32_Process -Filter \"ProcessId=${Number(lock.pid)}\" -ErrorAction SilentlyContinue;` +
      "$p|Select-Object ProcessId,ParentProcessId,CreationDate,Name,ExecutablePath,CommandLine|ConvertTo-Json -Compress",
  ],
  { encoding: "utf8" },
).trim();
if (!processJson) throw new Error("R552_CONTROLLER_PROCESS_MISSING");
const owner = JSON.parse(processJson);
if (
  Number(owner.ProcessId) !== Number(lock.pid) ||
  owner.Name !== "node.exe" ||
  !String(owner.CommandLine).includes("scripts/dev/r552Controller.mjs start")
) {
  throw new Error("R552_CONTROLLER_OWNER_RED");
}

const request = {
  schema_version: "rik-expo-app-r553.controller-handoff-request.v1",
  requested_utc: new Date().toISOString(),
  reason: "AUTHORITATIVE_MASTER_REBOUND_TO_R5_5_3",
  old_controller_pid: lock.pid,
  old_controller_process: owner,
  old_worktree: lock.worktree,
  old_master_sha256: OLD_MASTER_SHA256,
  new_master_sha256: NEW_MASTER_SHA256,
  old_heartbeat_generated_utc: heartbeat.generated_utc,
  old_heartbeat_payload_sha256: heartbeat.payload_sha256,
  graceful_stop_required: true,
  production_accessed: false,
  deployed: false,
  merged: false,
  released: false,
  ota: false,
};
request.payload_sha256 = sha256(JSON.stringify(request));
atomic(OLD_STOP, `${JSON.stringify(request, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({
    status: "GREEN_R552_GRACEFUL_STOP_REQUESTED_FOR_R553",
    pid: lock.pid,
    heartbeat_age_ms: heartbeatAgeMs,
    request_payload_sha256: request.payload_sha256,
  })}\n`,
);
