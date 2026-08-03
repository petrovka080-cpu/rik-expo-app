import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type RequiredArtifactProducer = {
  producer_id: string;
  owner: string;
  command: string | null;
  version: string;
  deterministic: boolean;
};

export type RequiredArtifactEntry = {
  path: string;
  content_type: "application/json" | "text/markdown";
  schema_version: string;
  content_sha256: string;
  bytes: number;
  input_fingerprint: string | null;
  producer: RequiredArtifactProducer;
  retention_policy: string;
  required_by_gates: string[];
};

export type RequiredArtifactManifest = {
  schema: "verification-required-artifacts:v1";
  manifest_version: 1;
  source_attestation: Record<string, unknown>;
  generated_at_excluded_from_content_hash: true;
  entries: RequiredArtifactEntry[];
  generated_at: string;
  content_sha256: string;
};

export type PreparedArtifact = {
  path: string;
  content_sha256: string;
  bytes: number;
  schema_version: string;
  producer_id: string;
  producer_version: string;
  deterministic: boolean;
  source: "destination" | "content-addressed-cache" | "canonical-producer";
  cache_reason: "destination-exact" | "cache-hit" | "producer-generated";
  read_only: boolean;
};

export type RequiredArtifactPreflightReport = {
  schema: "verification-required-artifact-preflight-report:v1";
  gate_name: "required-artifact-preflight";
  gate_version: "1";
  subject_sha: string;
  manifest_path: string;
  manifest_content_sha256: string;
  cache_root: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  required_artifacts: number;
  prepared_artifacts: number;
  cache_hits: number;
  destination_hits: number;
  producer_generations: number;
  failures: string[];
  artifacts: PreparedArtifact[];
  artifact_set_sha256: string;
  exit_code: 0 | 1;
  final_status: "GREEN_REQUIRED_ARTIFACT_PREFLIGHT_READY" | "STOP_REQUIRED_ARTIFACT_PREFLIGHT";
  fake_green_claimed: false;
};

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(filePath: string): string {
  return sha256(fs.readFileSync(filePath));
}

function assertSafeRelativeArtifactPath(filePath: string): void {
  const normalized = filePath.replace(/\\/g, "/");
  if (
    normalized !== filePath ||
    !normalized.startsWith("artifacts/") ||
    normalized.includes("../") ||
    path.isAbsolute(normalized)
  ) {
    throw new Error(`unsafe_required_artifact_path:${filePath}`);
  }
}

function safeResolve(root: string, relativePath: string): string {
  assertSafeRelativeArtifactPath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved === resolvedRoot || !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`required_artifact_outside_root:${relativePath}`);
  }
  return resolved;
}

export function contentAddressedCachePath(cacheRoot: string, contentSha256: string): string {
  if (!/^[a-f0-9]{64}$/.test(contentSha256)) throw new Error(`invalid_content_sha256:${contentSha256}`);
  return path.join(path.resolve(cacheRoot), "sha256", contentSha256.slice(0, 2), contentSha256);
}

export function loadRequiredArtifactManifest(manifestPath: string): RequiredArtifactManifest {
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as RequiredArtifactManifest;
  if (parsed.schema !== "verification-required-artifacts:v1" || parsed.manifest_version !== 1) {
    throw new Error("required_artifact_manifest_schema_mismatch");
  }
  const { generated_at: _generatedAt, content_sha256, ...body } = parsed;
  if (sha256(JSON.stringify(body)) !== content_sha256) {
    throw new Error("required_artifact_manifest_content_hash_mismatch");
  }
  const paths = new Set<string>();
  for (const entry of parsed.entries) {
    assertSafeRelativeArtifactPath(entry.path);
    if (paths.has(entry.path)) throw new Error(`duplicate_required_artifact:${entry.path}`);
    paths.add(entry.path);
    if (!/^[a-f0-9]{64}$/.test(entry.content_sha256) || !Number.isInteger(entry.bytes) || entry.bytes <= 0) {
      throw new Error(`invalid_required_artifact_attestation:${entry.path}`);
    }
    if (!entry.schema_version || !entry.producer?.producer_id || !entry.producer.version) {
      throw new Error(`incomplete_required_artifact_contract:${entry.path}`);
    }
    if (typeof entry.producer.deterministic !== "boolean") {
      throw new Error(`missing_deterministic_flag:${entry.path}`);
    }
    if (!entry.retention_policy || !entry.required_by_gates.includes("full-jest")) {
      throw new Error(`incomplete_retention_or_gate_contract:${entry.path}`);
    }
  }
  return parsed;
}

function validateArtifactFile(filePath: string, entry: RequiredArtifactEntry): string | null {
  if (!fs.existsSync(filePath)) return "missing";
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return "not_a_file";
  if (stat.size !== entry.bytes) return `bytes_mismatch:${stat.size}:${entry.bytes}`;
  const actualHash = sha256File(filePath);
  if (actualHash !== entry.content_sha256) return `hash_mismatch:${actualHash}:${entry.content_sha256}`;
  if (entry.content_type === "application/json") {
    try {
      JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      return `schema_invalid_json:${entry.schema_version}`;
    }
  }
  return null;
}

function setReadOnly(filePath: string): boolean {
  fs.chmodSync(filePath, 0o444);
  const mode = fs.statSync(filePath).mode & 0o777;
  return (mode & 0o222) === 0;
}

function copyCacheBlob(cachePath: string, destinationPath: string): void {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  const temporaryPath = `${destinationPath}.verification-preflight.tmp`;
  fs.copyFileSync(cachePath, temporaryPath);
  fs.renameSync(temporaryPath, destinationPath);
}

function runProducer(root: string, producer: RequiredArtifactProducer): void {
  if (!producer.deterministic || !producer.command) {
    throw new Error(`required_artifact_cache_miss_no_deterministic_producer:${producer.producer_id}`);
  }
  const result = spawnSync(producer.command, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      VERIFICATION_CANONICAL_WRITE: "1",
    },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `required_artifact_producer_failed:${producer.producer_id}:${String(result.status)}:${(result.stderr ?? "").slice(-1000)}`,
    );
  }
}

function writeReport(outputPath: string, report: RequiredArtifactPreflightReport): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function gitSha(root: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

export function prepareRequiredArtifacts(input: {
  root: string;
  manifestPath: string;
  cacheRoot: string;
  reportPath: string;
  subjectSha?: string;
  generateOnMiss?: boolean;
}): RequiredArtifactPreflightReport {
  const started = new Date();
  const root = path.resolve(input.root);
  const manifestPath = path.resolve(input.manifestPath);
  const cacheRoot = path.resolve(input.cacheRoot);
  const subjectSha = input.subjectSha ?? gitSha(root);
  const artifacts: PreparedArtifact[] = [];
  const failures: string[] = [];
  let manifest: RequiredArtifactManifest;
  try {
    manifest = loadRequiredArtifactManifest(manifestPath);
  } catch (error) {
    const ended = new Date();
    const failure = error instanceof Error ? error.message : String(error);
    const report: RequiredArtifactPreflightReport = {
      schema: "verification-required-artifact-preflight-report:v1",
      gate_name: "required-artifact-preflight",
      gate_version: "1",
      subject_sha: subjectSha,
      manifest_path: manifestPath,
      manifest_content_sha256: "invalid",
      cache_root: cacheRoot,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_ms: ended.getTime() - started.getTime(),
      required_artifacts: 0,
      prepared_artifacts: 0,
      cache_hits: 0,
      destination_hits: 0,
      producer_generations: 0,
      failures: [failure],
      artifacts: [],
      artifact_set_sha256: sha256(""),
      exit_code: 1,
      final_status: "STOP_REQUIRED_ARTIFACT_PREFLIGHT",
      fake_green_claimed: false,
    };
    writeReport(input.reportPath, report);
    throw new Error(failure);
  }

  const producerRuns = new Set<string>();
  for (const entry of manifest.entries) {
    try {
      const destinationPath = safeResolve(root, entry.path);
      const destinationValidation = validateArtifactFile(destinationPath, entry);
      let source: PreparedArtifact["source"] = "destination";
      let cacheReason: PreparedArtifact["cache_reason"] = "destination-exact";
      if (destinationValidation === "missing") {
        const cachePath = contentAddressedCachePath(cacheRoot, entry.content_sha256);
        const cacheValidation = validateArtifactFile(cachePath, entry);
        if (cacheValidation === null) {
          copyCacheBlob(cachePath, destinationPath);
          source = "content-addressed-cache";
          cacheReason = "cache-hit";
        } else if (input.generateOnMiss === true && entry.producer.deterministic && entry.producer.command) {
          if (!producerRuns.has(entry.producer.producer_id)) {
            runProducer(root, entry.producer);
            producerRuns.add(entry.producer.producer_id);
          }
          source = "canonical-producer";
          cacheReason = "producer-generated";
        } else {
          throw new Error(
            `cache_miss:${entry.path}:${cacheValidation}:${entry.producer.producer_id}:deterministic=${String(entry.producer.deterministic)}`,
          );
        }
      } else if (destinationValidation !== null) {
        throw new Error(`destination_stale_or_mismatched:${entry.path}:${destinationValidation}`);
      }
      const finalValidation = validateArtifactFile(destinationPath, entry);
      if (finalValidation !== null) {
        throw new Error(`prepared_artifact_invalid:${entry.path}:${finalValidation}`);
      }
      const readOnly = setReadOnly(destinationPath);
      if (!readOnly) throw new Error(`prepared_artifact_not_read_only:${entry.path}`);
      artifacts.push({
        path: entry.path,
        content_sha256: entry.content_sha256,
        bytes: entry.bytes,
        schema_version: entry.schema_version,
        producer_id: entry.producer.producer_id,
        producer_version: entry.producer.version,
        deterministic: entry.producer.deterministic,
        source,
        cache_reason: cacheReason,
        read_only: readOnly,
      });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      break;
    }
  }
  const ended = new Date();
  const artifactSetSha256 = sha256(
    artifacts.map((item) => `${item.path}\0${item.content_sha256}\0${item.bytes}\n`).join(""),
  );
  const green = failures.length === 0 && artifacts.length === manifest.entries.length;
  const report: RequiredArtifactPreflightReport = {
    schema: "verification-required-artifact-preflight-report:v1",
    gate_name: "required-artifact-preflight",
    gate_version: "1",
    subject_sha: subjectSha,
    manifest_path: manifestPath,
    manifest_content_sha256: manifest.content_sha256,
    cache_root: cacheRoot,
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    duration_ms: ended.getTime() - started.getTime(),
    required_artifacts: manifest.entries.length,
    prepared_artifacts: artifacts.length,
    cache_hits: artifacts.filter((item) => item.source === "content-addressed-cache").length,
    destination_hits: artifacts.filter((item) => item.source === "destination").length,
    producer_generations: producerRuns.size,
    failures,
    artifacts,
    artifact_set_sha256: artifactSetSha256,
    exit_code: green ? 0 : 1,
    final_status: green
      ? "GREEN_REQUIRED_ARTIFACT_PREFLIGHT_READY"
      : "STOP_REQUIRED_ARTIFACT_PREFLIGHT",
    fake_green_claimed: false,
  };
  writeReport(input.reportPath, report);
  if (!green) throw new Error(failures[0] ?? "required_artifact_preflight_incomplete");
  return report;
}

export function verifyPreparedArtifactsImmutable(input: {
  root: string;
  manifestPath: string;
  preflight: RequiredArtifactPreflightReport;
}): { immutable: boolean; changed: string[]; artifact_set_sha256: string } {
  const manifest = loadRequiredArtifactManifest(input.manifestPath);
  const changed: string[] = [];
  const rows: string[] = [];
  for (const entry of manifest.entries) {
    const absolutePath = safeResolve(input.root, entry.path);
    const validation = validateArtifactFile(absolutePath, entry);
    if (validation !== null) changed.push(`${entry.path}:${validation}`);
    rows.push(`${entry.path}\0${fs.existsSync(absolutePath) ? sha256File(absolutePath) : "missing"}\0${entry.bytes}\n`);
  }
  const artifactSetSha256 = sha256(rows.join(""));
  if (artifactSetSha256 !== input.preflight.artifact_set_sha256) {
    changed.push(
      `artifact_set_hash:${artifactSetSha256}:${input.preflight.artifact_set_sha256}`,
    );
  }
  return { immutable: changed.length === 0, changed, artifact_set_sha256: artifactSetSha256 };
}
