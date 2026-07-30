import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type RunScopedEvidenceArtifact =
  | { kind: "json"; value: unknown }
  | { kind: "text"; value: string };

export type RunScopedEvidenceResult = {
  gateId: string;
  manifestPath: string;
  runDirectory: string;
  runId: string;
  subjectSha: string;
};

export function currentEvidenceSubjectSha(root = process.cwd()): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

export function atomicWriteEvidence(
  filePath: string,
  content: string,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, content, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

export function withTerminalWriterMetadata<T extends Record<string, unknown>>(
  value: T,
  subjectSha = currentEvidenceSubjectSha(),
): T & {
  subject_sha: string;
  writer_complete: true;
} {
  return {
    ...value,
    subject_sha: subjectSha,
    writer_complete: true,
  };
}

function safeSegment(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error(`RUN_SCOPED_EVIDENCE_SEGMENT_INVALID:${value}`);
  return normalized;
}

export function writeRunScopedEvidence(input: {
  artifacts: Record<string, RunScopedEvidenceArtifact>;
  gateId: string;
  root?: string;
  runId?: string;
  startedAt?: string;
}): RunScopedEvidenceResult {
  const root = path.resolve(input.root ?? process.cwd());
  const subjectSha = currentEvidenceSubjectSha(root);
  const gateId = safeSegment(input.gateId);
  const runId = safeSegment(
    input.runId ??
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`,
  );
  const runDirectory = path.join(
    root,
    "artifacts",
    "runs",
    subjectSha,
    gateId,
    runId,
  );
  const startedAt = input.startedAt ?? new Date().toISOString();
  const hashes: Array<{ bytes: number; path: string; sha256: string }> = [];
  for (const [relativePath, artifact] of Object.entries(input.artifacts)) {
    const normalized = relativePath.replace(/\\/g, "/");
    if (
      normalized !== relativePath ||
      normalized.startsWith("/") ||
      normalized.includes("../") ||
      path.isAbsolute(normalized)
    ) {
      throw new Error(`RUN_SCOPED_EVIDENCE_PATH_INVALID:${relativePath}`);
    }
    const content =
      artifact.kind === "json"
        ? `${JSON.stringify(artifact.value, null, 2)}\n`
        : artifact.value.endsWith("\n")
          ? artifact.value
          : `${artifact.value}\n`;
    atomicWriteEvidence(path.join(runDirectory, normalized), content);
    hashes.push({
      bytes: Buffer.byteLength(content),
      path: normalized,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  const manifestPath = path.join(runDirectory, "writer-manifest.json");
  atomicWriteEvidence(
    manifestPath,
    `${JSON.stringify({
      schema: "run-scoped-evidence-writer-v1",
      gate_id: gateId,
      run_id: runId,
      subject_sha: subjectSha,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      writer_complete: true,
      artifacts: hashes.sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
      fake_green_claimed: false,
    }, null, 2)}\n`,
  );
  return {
    gateId,
    manifestPath,
    runDirectory,
    runId,
    subjectSha,
  };
}
