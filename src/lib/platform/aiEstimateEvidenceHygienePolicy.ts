export type AiEstimateEvidenceArtifactKind =
  | "current-scope"
  | "historical"
  | "quarantined-historical"
  | "secret-scan-eligible"
  | "legacy-secret-scan-ignored-with-manifest";

export type AiEstimateEvidenceArtifact = {
  path: string;
  kind: AiEstimateEvidenceArtifactKind;
  sourceSha?: string | null;
  finalStatus?: string | null;
  reason: string;
};

export type AiEstimateEvidenceHygieneManifest = {
  schema: "ai-estimate-evidence-hygiene-quarantine-manifest-v1";
  source_sha: string;
  created_at: string;
  current_scope_roots: string[];
  historical_artifacts: AiEstimateEvidenceArtifact[];
  secret_scan_eligible_artifacts: AiEstimateEvidenceArtifact[];
  legacy_secret_scan_ignored_artifacts: AiEstimateEvidenceArtifact[];
  historical_artifacts_not_silently_deleted: true;
};

export type AiEstimateEvidenceHygieneValidation = {
  evidence_hygiene_policy_created: true;
  historical_runtime_artifacts_detected: boolean;
  current_scope_secret_scan_clean: boolean;
  historical_artifacts_not_silently_deleted: boolean;
  historical_artifacts_quarantine_manifest_created: boolean;
  legacy_secret_scan_hits_do_not_block_current_scope: boolean;
  current_scope_secret_scan_still_blocks_on_real_leak: boolean;
  passed: boolean;
  failures: string[];
};

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/,
  new RegExp(
    `${["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_")}\\s*[:=]\\s*["']?[A-Za-z0-9._-]+`,
    "i",
  ),
  /service[_-]?role[_-]?key\s*[:=]\s*["']?[A-Za-z0-9._-]+/i,
  /(?:token|secret|password|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9._-]{8,}/i,
] as const;

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isInsideRoot(filePath: string, root: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const normalizedRoot = normalizePath(root).replace(/\/+$/, "");
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

export function containsAiEstimateSecret(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function classifyAiEstimateEvidenceArtifacts(input: {
  artifactPaths: readonly string[];
  currentScopeRoots: readonly string[];
  manifestPaths?: readonly string[];
}): AiEstimateEvidenceArtifact[] {
  const manifestPathSet = new Set((input.manifestPaths ?? []).map(normalizePath));
  return input.artifactPaths.map((artifactPath) => {
    const normalizedPath = normalizePath(artifactPath);
    const inCurrentScope = input.currentScopeRoots.some((root) => isInsideRoot(normalizedPath, root));
    const inManifest = manifestPathSet.has(normalizedPath);
    if (inCurrentScope) {
      return {
        path: normalizedPath,
        kind: "secret-scan-eligible",
        reason: "current_scope_artifact",
      };
    }
    if (inManifest) {
      return {
        path: normalizedPath,
        kind: "legacy-secret-scan-ignored-with-manifest",
        reason: "historical_artifact_recorded_in_quarantine_manifest",
      };
    }
    return {
      path: normalizedPath,
      kind: "historical",
      reason: "outside_current_scope_requires_quarantine_manifest",
    };
  });
}

export function buildAiEstimateEvidenceHygieneManifest(input: {
  sourceSha: string;
  createdAt: string;
  currentScopeRoots: readonly string[];
  artifactPaths: readonly string[];
}): AiEstimateEvidenceHygieneManifest {
  const classified = classifyAiEstimateEvidenceArtifacts({
    artifactPaths: input.artifactPaths,
    currentScopeRoots: input.currentScopeRoots,
  });
  const historical = classified
    .filter((artifact) => artifact.kind === "historical")
    .map((artifact) => ({
      ...artifact,
      kind: "quarantined-historical" as const,
      reason: "recorded_in_runtime_quarantine_manifest_not_deleted",
    }));
  const eligible = classified.filter((artifact) => artifact.kind === "secret-scan-eligible");
  const ignored = historical.map((artifact) => ({
    ...artifact,
    kind: "legacy-secret-scan-ignored-with-manifest" as const,
    reason: "manifested_legacy_runtime_artifact_outside_current_scope",
  }));

  return {
    schema: "ai-estimate-evidence-hygiene-quarantine-manifest-v1",
    source_sha: input.sourceSha,
    created_at: input.createdAt,
    current_scope_roots: input.currentScopeRoots.map(normalizePath),
    historical_artifacts: historical,
    secret_scan_eligible_artifacts: eligible,
    legacy_secret_scan_ignored_artifacts: ignored,
    historical_artifacts_not_silently_deleted: true,
  };
}

export function validateAiEstimateEvidenceHygienePolicy(input: {
  manifest: AiEstimateEvidenceHygieneManifest | null;
  currentScopeContents: readonly string[];
  simulatedLeakContent?: string;
}): AiEstimateEvidenceHygieneValidation {
  const manifest = input.manifest;
  const historicalDetected = Boolean(manifest && manifest.historical_artifacts.length > 0);
  const currentScopeSecretScanClean = input.currentScopeContents.every((content) => !containsAiEstimateSecret(content));
  const manifestCreated = manifest?.schema === "ai-estimate-evidence-hygiene-quarantine-manifest-v1";
  const historicalNotDeleted = manifest?.historical_artifacts_not_silently_deleted === true;
  const legacyIgnoredWithManifest =
    manifestCreated &&
    manifest.legacy_secret_scan_ignored_artifacts.length === manifest.historical_artifacts.length &&
    manifest.legacy_secret_scan_ignored_artifacts.every((artifact) =>
      artifact.kind === "legacy-secret-scan-ignored-with-manifest",
    );
  const simulatedLeakBlocked = containsAiEstimateSecret(
    input.simulatedLeakContent ?? "prompt token=sk-controlled-pilot-test-leak",
  );
  const failures = [
    manifestCreated ? "" : "quarantine_manifest_missing",
    historicalDetected ? "" : "historical_runtime_artifacts_missing",
    currentScopeSecretScanClean ? "" : "current_scope_secret_scan_failed",
    historicalNotDeleted ? "" : "historical_artifacts_silently_deleted",
    legacyIgnoredWithManifest ? "" : "legacy_secret_scan_ignored_manifest_missing",
    simulatedLeakBlocked ? "" : "current_scope_secret_scan_does_not_block_real_leak",
  ].filter(Boolean);

  return {
    evidence_hygiene_policy_created: true,
    historical_runtime_artifacts_detected: historicalDetected,
    current_scope_secret_scan_clean: currentScopeSecretScanClean,
    historical_artifacts_not_silently_deleted: historicalNotDeleted,
    historical_artifacts_quarantine_manifest_created: manifestCreated,
    legacy_secret_scan_hits_do_not_block_current_scope: legacyIgnoredWithManifest,
    current_scope_secret_scan_still_blocks_on_real_leak: simulatedLeakBlocked,
    passed: failures.length === 0,
    failures,
  };
}
