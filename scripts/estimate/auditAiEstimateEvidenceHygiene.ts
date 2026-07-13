import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildAiEstimateEvidenceHygieneManifest,
  containsAiEstimateSecret,
  validateAiEstimateEvidenceHygienePolicy,
} from "../../src/lib/platform/aiEstimateEvidenceHygienePolicy";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { CONTROLLED_PILOT_DRY_RUN_ROOT } from "./runControlledPilotDryRunScenarios";

export const EVIDENCE_HYGIENE_ROOT = path.join(".release-runtime", "evidence-hygiene");
export const EVIDENCE_HYGIENE_MANIFEST_PATH = path.join(EVIDENCE_HYGIENE_ROOT, "quarantine-manifest.json");

export const GREEN_AI_ESTIMATE_EVIDENCE_HYGIENE =
  "GREEN_AI_ESTIMATE_EVIDENCE_HYGIENE" as const;
export const STOP_AI_ESTIMATE_EVIDENCE_HYGIENE =
  "STOP_AI_ESTIMATE_EVIDENCE_HYGIENE_INCOMPLETE_NO_GREEN" as const;

const CURRENT_SCOPE_ROOTS = [
  CONTROLLED_PILOT_DRY_RUN_ROOT,
  path.join(".release-runtime", "ai-estimate-owner-review-pilot-operating-system"),
] as const;

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isInsideRoot(filePath: string, root: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const normalizedRoot = normalizePath(root).replace(/\/+$/, "");
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

function shouldInspectFile(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);
  if (!normalizedPath.startsWith(".release-runtime/")) return false;
  if (isInsideRoot(normalizedPath, EVIDENCE_HYGIENE_ROOT)) return false;
  if (/\.(png|jpg|jpeg|webp|pdf|apk|aab|ipa|sqlite|sqlite3)$/i.test(normalizedPath)) return false;
  return /(summary|ledger|case-results|stdout|stderr|logcat|manifest)|\.(json|jsonl|txt|md|log)$/i.test(normalizedPath);
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!entry.isFile()) return [];
    return shouldInspectFile(fullPath) ? [fullPath] : [];
  });
}

function safeRead(filePath: string): string {
  try {
    const stats = statSync(filePath);
    if (stats.size > 512_000) return "";
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function auditAiEstimateEvidenceHygiene(options: { writeRuntime?: boolean } = {}) {
  const sourceSha = currentSourceSha();
  const artifactPaths = walkFiles(".release-runtime").map(normalizePath);
  const manifest = buildAiEstimateEvidenceHygieneManifest({
    sourceSha,
    createdAt: new Date().toISOString(),
    currentScopeRoots: CURRENT_SCOPE_ROOTS,
    artifactPaths,
  });

  mkdirSync(EVIDENCE_HYGIENE_ROOT, { recursive: true });
  writeFileSync(EVIDENCE_HYGIENE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const currentScopeFiles = manifest.secret_scan_eligible_artifacts.map((artifact) => artifact.path);
  const currentScopeContents = currentScopeFiles.map(safeRead);
  const validation = validateAiEstimateEvidenceHygienePolicy({
    manifest,
    currentScopeContents,
    simulatedLeakContent: "AI_ESTIMATE_TEST_TOKEN=sk-controlled-pilot-current-scope-test-leak",
  });
  const currentScopeSecretHits = currentScopeContents
    .map((content, index) => ({
      path: currentScopeFiles[index],
      hit: containsAiEstimateSecret(content),
    }))
    .filter((item) => item.hit)
    .map((item) => item.path);
  const blockers = [
    ...validation.failures,
    currentScopeSecretHits.length === 0 ? "" : `current_scope_secret_hits:${currentScopeSecretHits.join("|")}`,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_EVIDENCE_HYGIENE
      : STOP_AI_ESTIMATE_EVIDENCE_HYGIENE,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    manifest_path_runtime_only: normalizePath(EVIDENCE_HYGIENE_MANIFEST_PATH),
    current_scope_roots: CURRENT_SCOPE_ROOTS.map(normalizePath),
    current_scope_artifacts_count: manifest.secret_scan_eligible_artifacts.length,
    historical_artifacts_count: manifest.historical_artifacts.length,
    legacy_secret_scan_ignored_count: manifest.legacy_secret_scan_ignored_artifacts.length,
    current_scope_secret_hits: currentScopeSecretHits,
    ...validation,
    owner_approved: false,
    production_release_started: false,
    contract_total_claimed: false,
    public_beta_started: false,
    historical_artifacts_deleted: false,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
  const runtime = options.writeRuntime === false
    ? { artifactPath: null, artifact: summary }
    : writeRuntimeJson(EVIDENCE_HYGIENE_ROOT, summary);
  return {
    artifactPath: runtime.artifactPath,
    artifact: runtime.artifact,
    manifest,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimateEvidenceHygiene.ts")) {
  const result = auditAiEstimateEvidenceHygiene();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    manifest: normalizePath(EVIDENCE_HYGIENE_MANIFEST_PATH),
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_EVIDENCE_HYGIENE) process.exitCode = 1;
}
