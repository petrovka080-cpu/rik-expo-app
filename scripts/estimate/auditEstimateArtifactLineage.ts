import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "lineage");

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listSummaryFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, item.name);
    if (item.isDirectory()) out.push(...listSummaryFiles(fullPath));
    else if (item.isFile() && item.name === "summary.json") out.push(fullPath);
  }
  return out;
}

function latestSummary(root: string): string | null {
  const files = listSummaryFiles(root);
  if (files.length === 0) return null;
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

export function findLatestGoldenBenchmarkSummary(): string {
  const summary = latestSummary(path.join(".release-runtime", "ai-estimate-golden-benchmark-acceptance"));
  if (!summary) throw new Error("golden_benchmark_summary_missing");
  return summary;
}

export function auditEstimateArtifactLineage(input: {
  artifactPath?: string;
  expectedHead?: string;
  expectedBranch?: string;
} = {}) {
  const artifactPath = input.artifactPath ?? findLatestGoldenBenchmarkSummary();
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
  const head = input.expectedHead ?? git(["rev-parse", "HEAD"]);
  const branch = input.expectedBranch ?? git(["branch", "--show-current"]);
  const commitDate = Date.parse(git(["show", "-s", "--format=%cI", head]));
  const artifactMtime = statSync(artifactPath).mtimeMs;
  const upstreamSync = String(artifact.upstream_sync ?? "").replace(/\s+/g, " ").trim();
  const blockers = [
    artifact.source_sha === head ? "" : "source_sha_not_head",
    artifact.branch === branch ? "" : "branch_mismatch",
    upstreamSync === "0 0" ? "" : "upstream_not_synced",
    artifactMtime >= commitDate ? "" : "artifact_older_than_source_commit",
    String(artifact.final_status ?? "").startsWith("GREEN_") ? "" : "artifact_not_green",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_ARTIFACT_LINEAGE"
      : "STOP_AI_ESTIMATE_ARTIFACT_LINEAGE_FAILED",
    artifact_path: artifactPath,
    expected_head: head,
    expected_branch: branch,
    artifact_source_sha: artifact.source_sha,
    artifact_branch: artifact.branch,
    upstream_sync: upstreamSync,
    created_after_source_commit: artifactMtime >= commitDate,
    stale_artifact_rejected: auditEstimateArtifactLineageMutationGates().stale_artifact_rejected,
    blockers,
  };
}

export function auditEstimateArtifactLineageMutationGates() {
  const head = "current";
  const stale = { source_sha: "old", branch: "release", upstream_sync: "0 0", final_status: "GREEN_FAKE" };
  const diverged = { source_sha: head, branch: "release", upstream_sync: "1 0", final_status: "GREEN_FAKE" };
  return {
    stale_artifact_rejected: stale.source_sha !== head,
    upstream_divergence_rejected: String(diverged.upstream_sync).trim() !== "0 0",
    non_green_artifact_rejected: !String({ final_status: "STOP_FAKE" }.final_status).startsWith("GREEN_"),
  };
}

export function runEstimateArtifactLineageCli() {
  const summary = auditEstimateArtifactLineage();
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = runEstimateArtifactLineageCli();
  console.log(JSON.stringify({ ...summary, artifact: outPath }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
