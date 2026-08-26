import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(".");
const OLD_LOCK = resolve(".release-runtime/r542/runtime/r542-controller.lock.json");
const OLD_STOP = resolve(".release-runtime/r542/runtime/r542-controller.stop.json");
const OLD_HEARTBEAT = resolve(
  ".release-runtime/r542/evidence/08_R542_CONTROLLER_HEARTBEAT.jsonl",
);
const NEW_MASTER_SHA256 = "fc1061ea34be0a633898200a8f9de38dd694e6dc1e0aee393d89066177c8e6c6";
const OLD_MASTER_SHA256 = "98886f63c45feb230163e1213c157065f7c38d992f05bcb38033905350d58b2b";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function atomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text, "utf8");
  renameSync(temporary, path);
}

if (existsSync(OLD_STOP)) throw new Error("R542_STOP_SENTINEL_ALREADY_EXISTS");
const lock = JSON.parse(readFileSync(OLD_LOCK, "utf8"));
const heartbeat = JSON.parse(readFileSync(OLD_HEARTBEAT, "utf8").trim().split(/\r?\n/u).at(-1));
if (heartbeat.master_sha256 !== OLD_MASTER_SHA256 || heartbeat.controller_pid !== lock.pid) {
  throw new Error("R542_CONTROLLER_IDENTITY_RED");
}
const ageMs = Date.now() - Date.parse(heartbeat.generated_utc);
if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 120_000) {
  throw new Error(`R542_HEARTBEAT_STALE:${ageMs}`);
}
const processJson = execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-Command",
    `$p=Get-CimInstance Win32_Process -Filter \"ProcessId=${Number(lock.pid)}\" -ErrorAction SilentlyContinue;` +
      "$p|Select-Object ProcessId,Name,CommandLine|ConvertTo-Json -Compress",
  ],
  { encoding: "utf8" },
).trim();
if (!processJson) throw new Error("R542_CONTROLLER_PROCESS_MISSING");
const owner = JSON.parse(processJson);
if (
  owner.ProcessId !== lock.pid ||
  owner.Name !== "node.exe" ||
  !String(owner.CommandLine).includes("r542Controller.mjs start") ||
  !String(owner.CommandLine).replaceAll("\\", "/").includes(ROOT.replaceAll("\\", "/"))
) {
  throw new Error("R542_CONTROLLER_OWNER_RED");
}
const request = {
  schema_version: "rik-expo-app-r552.controller-handoff-request.v1",
  requested_utc: new Date().toISOString(),
  reason: "AUTHORITATIVE_MASTER_REBOUND_TO_R5_5_2",
  old_controller_pid: lock.pid,
  old_master_sha256: OLD_MASTER_SHA256,
  new_master_sha256: NEW_MASTER_SHA256,
  old_heartbeat_payload_sha256: heartbeat.payload_sha256,
  graceful_stop_required: true,
  production_accessed: false,
};
request.payload_sha256 = sha256(JSON.stringify(request));
atomic(OLD_STOP, `${JSON.stringify(request, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({ status: "GREEN_R542_GRACEFUL_STOP_REQUESTED", pid: lock.pid, age_ms: ageMs })}\n`,
);
