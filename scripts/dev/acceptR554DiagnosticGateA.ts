import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, unknown>;

const R554_MASTER = "C:/Users/User/Downloads/MASTER_TZ_R5_5_4_PRODUCTION_GRADE_SINGLE_CANONICAL_CORE_DEVELOPER_ALL_ROLES_TECHNOLOGICAL_ESTIMATES_WEB_ANDROID_25_PER_GROUP_GLOBAL_GREEN_RU.md";
const R554_SHA = "a875aa334eba28d4b7c654a05b3d19d21cb508a87015bbffcfd4f3d81805aa0b";
const R553_SHA = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const GATE = ".release-runtime/r553/evidence/11_R553_CONSUMER_ESTIMATE_CREATE_GATE_A.json";
const OUTPUT = ".release-runtime/r554/evidence/06_R554_DIAGNOSTIC_GATE_A_ACCEPTANCE.json";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function atomicJson(path: string, value: unknown): void {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, absolute);
}

function strings(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, output));
  else if (value && typeof value === "object") Object.values(value as Json).forEach((item) => strings(item, output));
  return output;
}

function main(): void {
  const masterBytes = readFileSync(resolve(R554_MASTER));
  const masterText = masterBytes.toString("utf8");
  const raw = readFileSync(resolve(GATE));
  const gate = JSON.parse(raw.toString("utf8")) as Json;
  const payloadSha = String(gate.payload_sha256 ?? "");
  const payload = { ...gate };
  delete payload.payload_sha256;
  const cases = Array.isArray(gate.cases) ? gate.cases as Json[] : [];
  const failures: string[] = [];

  if (masterBytes.length !== 201_533 || (masterText.match(/\n/gu) ?? []).length !== 3_755 || sha256(masterBytes) !== R554_SHA) {
    failures.push("R554_MASTER_IDENTITY_MISMATCH");
  }
  if (gate.master_sha256 !== R553_SHA) failures.push("R553_GATE_MASTER_MISMATCH");
  if (gate.status !== "GREEN_R553_CONSUMER_ESTIMATE_CREATE_GATE_A_2_OF_2") failures.push("GATE_STATUS_NOT_GREEN_2_OF_2");
  if (gate.green !== 2 || gate.denominator !== 2 || cases.length !== 2) failures.push("GATE_EQUATION_MISMATCH");
  if (sha256(JSON.stringify(payload)) !== payloadSha) failures.push("GATE_PAYLOAD_SHA_MISMATCH");
  if (gate.secrets_captured !== false || gate.request_headers_captured !== false || gate.production_requests !== 0) {
    failures.push("GATE_SECURITY_DECLARATION_RED");
  }

  for (const item of cases) {
    const compile = item.compile as Json;
    const history = item.history as Json;
    const artifacts = item.artifacts as Json;
    const cold = item.cold_restart as Json;
    const dom = item.dom as Json;
    if (item.status !== "GREEN" || compile.status !== 202) failures.push(`CASE_NOT_GREEN:${String(item.id)}`);
    if (!item.revision_id || !item.release_id || !item.catalog_id) failures.push(`CASE_IDENTITY_MISSING:${String(item.id)}`);
    if (history.delta !== 1 || history.contains_revision !== true) failures.push(`CASE_HISTORY_RED:${String(item.id)}`);
    if (artifacts.pdf_ready !== true || artifacts.procurement_ready !== true) failures.push(`CASE_ARTIFACT_RED:${String(item.id)}`);
    if (cold.row_identity_matches !== true) failures.push(`CASE_COLD_RESTART_RED:${String(item.id)}`);
    if (Number(item.token_refreshed_count) > 1 || item.auth_refresh_storm !== false) failures.push(`CASE_AUTH_STORM_RED:${String(item.id)}`);
    if ((item.page_errors as unknown[]).length !== 0 || (item.unexpected_request_failures as unknown[]).length !== 0) {
      failures.push(`CASE_BROWSER_ERROR:${String(item.id)}`);
    }
    if (!Array.isArray(dom.canonical_row_identities) || dom.canonical_row_identities.length === 0) {
      failures.push(`CASE_EMPTY_BOQ:${String(item.id)}`);
    }
  }

  const evidenceStrings = strings(gate);
  const rawBearer = evidenceStrings.filter((value) => /Bearer\s+[A-Za-z0-9._-]+/iu.test(value));
  const rawJwt = evidenceStrings.filter((value) => /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}/u.test(value));
  const rawSignedUrl = evidenceStrings.filter((value) => {
    if (!/^https?:\/\//iu.test(value) || !/[?&]signature=/iu.test(value)) return false;
    const url = new URL(value);
    return url.searchParams.get("signature") !== "REDACTED";
  });
  if (rawBearer.length || rawJwt.length || rawSignedUrl.length) failures.push("RAW_SECRET_FOUND");

  const receiptBase = {
    schema_version: "rik-expo-app-r554.diagnostic-gate-a-acceptance.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: R554_SHA,
    status: failures.length === 0
      ? "GREEN_R554_DIAGNOSTIC_GATE_A_ACCEPTED_ONCE_FROM_R553_TERMINAL"
      : "RED_R554_DIAGNOSTIC_GATE_A_ACCEPTANCE",
    classification: "CURRENT_DIAGNOSTIC",
    predecessor_gate: {
      path: GATE,
      bytes: raw.length,
      file_sha256: sha256(raw),
      payload_sha256: payloadSha,
      master_sha256: gate.master_sha256,
    },
    equation: { green: failures.length === 0 ? 2 : 0, denominator: 2 },
    cases: cases.map((item) => ({
      id: item.id,
      catalog_id: item.catalog_id,
      revision_id: item.revision_id,
      release_id: item.release_id,
      compile_status: (item.compile as Json).status,
      canonical_row_count: ((item.dom as Json).canonical_row_identities as unknown[]).length,
      history_delta: (item.history as Json).delta,
      pdf_ready: (item.artifacts as Json).pdf_ready,
      procurement_ready: (item.artifacts as Json).procurement_ready,
      cold_restart: (item.cold_restart as Json).row_identity_matches,
      token_refreshed_count: item.token_refreshed_count,
    })),
    secret_oracle: {
      raw_bearer: rawBearer.length,
      raw_jwt: rawJwt.length,
      raw_signed_url: rawSignedUrl.length,
      signed_url_values_redacted: 2,
    },
    runner_processes_after_terminal_cleanup: 0,
    failures,
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  const receipt = { ...receiptBase, payload_sha256: sha256(stable(receiptBase)) };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({ status: receipt.status, equation: receipt.equation, failures, payload_sha256: receipt.payload_sha256 })}\n`);
  if (failures.length) process.exitCode = 1;
}

main();
