import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type HarvestBucket =
  | "PRODUCT_ESTIMATE_QUALITY_PR"
  | "OWNER_SESSION_PROOF_PR"
  | "MOBILE_BUILD_PREFLIGHT_PR"
  | "MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE_PR"
  | "REAL10000_REVALIDATION_PR"
  | "GENERATED_ARTIFACT_HYGIENE_PR"
  | "OBSOLETE_SUPERSEDED_DO_NOT_PORT"
  | "UNKNOWN_REQUIRES_HUMAN_REVIEW";

type HarvestManifestItem = {
  path: string;
  gitStatus: string;
  bucket: HarvestBucket;
  useful: boolean;
  reason: string;
  targetBranch: string | null;
  mayPort: boolean;
  mayCommitNow: boolean;
  containsSecretRisk: boolean;
  productLogic: boolean;
  ownerSessionLogic: boolean;
  mobileReleaseLogic: boolean;
  generatedArtifact: boolean;
};

type HarvestManifest = {
  wave: "S_PARKED_WIP_HARVEST_AND_BRANCH_SPLIT_POINT_OF_NO_RETURN";
  final_status:
    | "READY_PARKED_WIP_HARVEST_MANIFEST"
    | "UNKNOWN_REQUIRES_HUMAN_REVIEW"
    | "SECRET_RISK_IN_HARVEST_FILE"
    | "MIXED_BUCKET_TARGET_BRANCH";
  source_branch: string;
  source_head: string;
  generated_at: string;
  items: HarvestManifestItem[];
  bucket_counts: Record<HarvestBucket, number>;
  hard_failures: string[];
  fake_green_claimed: false;
};

const TARGET_BRANCHES: Record<HarvestBucket, string | null> = {
  PRODUCT_ESTIMATE_QUALITY_PR: "feature/professional-estimate-quality-harvest",
  OWNER_SESSION_PROOF_PR: "feature/owner-live-quality-session-proof",
  MOBILE_BUILD_PREFLIGHT_PR: "feature/mobile-build-preflight-hardening",
  MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE_PR: "feature/mobile-installed-artifact-acceptance",
  REAL10000_REVALIDATION_PR: "feature/real10000-post-live-revalidation",
  GENERATED_ARTIFACT_HYGIENE_PR: "feature/generated-artifact-hygiene-harvest",
  OBSOLETE_SUPERSEDED_DO_NOT_PORT: null,
  UNKNOWN_REQUIRES_HUMAN_REVIEW: null,
};

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}

function gitRaw(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function matchAny(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filePath));
}

function isReleaseCleanupSuperseded(filePath: string): boolean {
  return matchAny(filePath, [
    /^artifacts\/S_PRODUCTION_RELEASE_STATE_CLEANUP(?:_|\/)/,
    /^artifacts\/S_PARKED_WIP_HARVEST\//,
    /^package\.json$/,
    /^scripts\/audit\/run(?:GeneratedArtifactHygiene|ReleaseGuardConsistency)Audit\.ts$/,
    /^scripts\/audit\/run(?:ProductionReleaseSecretScan|ProductionReleaseWaveInventory)\.ts$/,
    /^scripts\/audit\/runAiEstimate(?:EnterpriseFinalReadinessGoNoGo|PerformanceCloseoutAudit)\.ts$/,
    /^scripts\/release\/(?:classifyDirtyWorktreeByWave|normalizeReleaseProofTriplet|parkBlockedWaveState|planReleaseStateCleanupCommitBuckets|releaseStateCleanupCore|releaseTargetScope|releaseVerifyDirtyScope|releaseWaveDirtyScope|runProductionReleaseStateCleanup(?:Closeout|IsolatedCloseout)?Proof|runReleaseVerify(?:Core|Owner|Mobile)|stabilizeGeneratedReleaseArtifacts)\.ts$/,
    /^scripts\/release\/releaseGuard\.shared\.ts$/,
    /^tests\/releaseStateCleanup\//,
    /^tests\/architecture\/(?:finalReadinessReleaseVerifyDirtyScope|performanceCloseoutReleaseVerifyDirtyScope|noMatrixRepaintToGreen|noOwnerGateDeletion|noReleaseGuardWeakening|noSecretsInOwnerArtifacts|releaseCloseout|releaseState)/,
  ]);
}

function classifyBucket(filePath: string): { bucket: HarvestBucket; reason: string } {
  const file = normalizePath(filePath);

  if (isReleaseCleanupSuperseded(file) || file === "scripts/release/planParkedWipHarvest.ts") {
    return {
      bucket: "OBSOLETE_SUPERSEDED_DO_NOT_PORT",
      reason: "Already covered by the isolated release cleanup PR or local harvest bookkeeping.",
    };
  }

  if (
    matchAny(file, [
      /^src\/lib\/ai\/(?:estimatorKernel|professionalBoq|constructionDomainLexicon|constructionInterpreter|constructionFormulas|professionalQuality|globalEstimate|estimatePresentation|catalogBinding)\//,
      /^src\/lib\/estimatePdf\//,
      /^tests\/professionalQuality\//,
      /^tests\/architecture\/professionalQuality/,
      /^tests\/pdf\/ownerPdf/,
      /^tests\/catalogBinding\//,
      /^scripts\/e2e\/runWorldConstructionEstimateEngineProof\.ts$/,
    ])
  ) {
    return {
      bucket: "PRODUCT_ESTIMATE_QUALITY_PR",
      reason: "User-facing estimator, BOQ, PDF, catalog binding, or professional quality proof.",
    };
  }

  if (
    matchAny(file, [
      /^scripts\/e2e\/ownerQuality\//,
      /^scripts\/e2e\/ownerAccountLiveQualityLockCore\.ts$/,
      /^scripts\/e2e\/run(?:AndroidApi34OwnerAccountLiveQualityLockSmoke|OwnerAccountLiveEstimateQualityLockProof|OwnerAccountLiveEstimateQualityReplay|OwnerAccountPdfTableRealityReplay)\.ts$/,
      /^scripts\/audit\/runOwnerAccount/,
      /^tests\/architecture\/owner/,
      /^tests\/e2e\/ownerAccountLiveEstimateQualityLock\.web\.spec\.ts$/,
      /^tests\/liveQuality\//,
      /^artifacts\/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK\//,
    ])
  ) {
    return {
      bucket: "OWNER_SESSION_PROOF_PR",
      reason: "Owner-session proof or owner live quality lock logic.",
    };
  }

  if (
    matchAny(file, [
      /^eas\.json$/,
      /^scripts\/release\/(?:bumpMobileBuildVersion|mobileReleaseBuildCore|runAndroidQaApkBuild|runIosAppStoreConnectBuild|runIosAppStoreConnectSubmit|runMobileBuildPreflight|runMobileReleaseBuildProof)\.ts$/,
      /^scripts\/audit\/run(?:IosAppStoreConnectSubmission|MobileBuildSecret)Audit\.ts$/,
      /^tests\/mobileRelease\//,
      /^tests\/architecture\/mobileBuild/,
    ])
  ) {
    return {
      bucket: "MOBILE_BUILD_PREFLIGHT_PR",
      reason: "Mobile build preflight, versioning, store build, or build safety test.",
    };
  }

  if (
    matchAny(file, [
      /^scripts\/release\/(?:mobileInstalledArtifactAcceptanceCore|runMobileInstalledArtifactAcceptancePreflight|runMobileInstalledArtifactAcceptanceProof)\.ts$/,
      /^scripts\/e2e\/run(?:AndroidQaApkInstallSmoke|AndroidQaApkInstalledArtifactAcceptance|IosTestFlightInstalledArtifactSmoke)\.ts$/,
      /^scripts\/audit\/run(?:AndroidApkArtifactIntegrity|IosTestFlightProcessing|MobileInstalledEstimateSmokeQuality|MobileStoreReviewSafety)Audit\.ts$/,
      /^tests\/mobileArtifactAcceptance\//,
      /^tests\/architecture\/mobileArtifact/,
    ])
  ) {
    return {
      bucket: "MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE_PR",
      reason: "Installed artifact acceptance logic gated behind a green mobile build.",
    };
  }

  if (
    matchAny(file, [
      /^scripts\/e2e\/(?:real10000AcceptanceCore|runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding|runReal10000DiverseConstructionWorksExpandedEstimateProof|runReal10000DiverseConstructionWorksShard(?:Merge|Proof))\.ts$/,
      /^scripts\/e2e\/canonicalApi34Evidence\.ts$/,
      /^scripts\/release\/runLiveB2cEstimateRealityReleaseCloseoutProof\.ts$/,
      /^tests\/architecture\/(?:real10000|worldConstructionReleaseReusePolicy|releaseVerifyLiveCloseoutGeneratedArtifacts|releaseVerifyUsesCanonicalApi34Evidence)/,
      /^artifacts\/S_REAL10000/,
    ])
  ) {
    return {
      bucket: "REAL10000_REVALIDATION_PR",
      reason: "Real10000 or canonical Android API34 revalidation proof path.",
    };
  }

  if (file.startsWith("artifacts/")) {
    return {
      bucket: "GENERATED_ARTIFACT_HYGIENE_PR",
      reason: "Generated artifact churn must be stabilized or regenerated in its own hygiene branch.",
    };
  }

  return {
    bucket: "UNKNOWN_REQUIRES_HUMAN_REVIEW",
    reason: "No safe harvest bucket matched this path.",
  };
}

function secretRisk(filePath: string): boolean {
  const file = normalizePath(filePath).toLowerCase();
  return (
    file.includes(".env") ||
    file.includes("secret") ||
    file.includes("password") ||
    file.includes("credential") ||
    file.endsWith(".p8") ||
    file.endsWith(".pem")
  );
}

function parseStatusLine(line: string): { gitStatus: string; file: string } | null {
  if (!line.trim()) return null;
  const gitStatus = line.slice(0, 2).trim() || line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const file = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() ?? rawPath : rawPath;
  return { gitStatus, file: normalizePath(file) };
}

function emptyBucketCounts(): Record<HarvestBucket, number> {
  return {
    PRODUCT_ESTIMATE_QUALITY_PR: 0,
    OWNER_SESSION_PROOF_PR: 0,
    MOBILE_BUILD_PREFLIGHT_PR: 0,
    MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE_PR: 0,
    REAL10000_REVALIDATION_PR: 0,
    GENERATED_ARTIFACT_HYGIENE_PR: 0,
    OBSOLETE_SUPERSEDED_DO_NOT_PORT: 0,
    UNKNOWN_REQUIRES_HUMAN_REVIEW: 0,
  };
}

function buildManifest(): HarvestManifest {
  const statusLines = gitRaw(["status", "--short", "--untracked-files=all"])
    .split(/\r?\n/)
    .map(parseStatusLine)
    .filter((item): item is { gitStatus: string; file: string } => item !== null);

  const items = statusLines.map((item): HarvestManifestItem => {
    const classification = classifyBucket(item.file);
    const bucket = classification.bucket;
    const targetBranch = TARGET_BRANCHES[bucket];
    const useful = bucket !== "OBSOLETE_SUPERSEDED_DO_NOT_PORT" && bucket !== "UNKNOWN_REQUIRES_HUMAN_REVIEW";
    const generatedArtifact = item.file.startsWith("artifacts/");

    return {
      path: item.file,
      gitStatus: item.gitStatus,
      bucket,
      useful,
      reason: classification.reason,
      targetBranch,
      mayPort: useful && !secretRisk(item.file),
      mayCommitNow: bucket === "PRODUCT_ESTIMATE_QUALITY_PR" && !secretRisk(item.file),
      containsSecretRisk: secretRisk(item.file),
      productLogic: bucket === "PRODUCT_ESTIMATE_QUALITY_PR",
      ownerSessionLogic: bucket === "OWNER_SESSION_PROOF_PR",
      mobileReleaseLogic:
        bucket === "MOBILE_BUILD_PREFLIGHT_PR" || bucket === "MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE_PR",
      generatedArtifact,
    };
  });

  const bucketCounts = emptyBucketCounts();
  for (const item of items) {
    bucketCounts[item.bucket] += 1;
  }

  const branchBuckets = new Map<string, Set<HarvestBucket>>();
  for (const item of items) {
    if (!item.targetBranch) continue;
    const buckets = branchBuckets.get(item.targetBranch) ?? new Set<HarvestBucket>();
    buckets.add(item.bucket);
    branchBuckets.set(item.targetBranch, buckets);
  }

  const hardFailures: string[] = [];
  if (items.some((item) => item.bucket === "UNKNOWN_REQUIRES_HUMAN_REVIEW")) {
    hardFailures.push("UNKNOWN_REQUIRES_HUMAN_REVIEW");
  }
  if (items.some((item) => item.containsSecretRisk && item.mayPort)) {
    hardFailures.push("SECRET_RISK_IN_HARVEST_FILE");
  }
  if ([...branchBuckets.values()].some((buckets) => buckets.size > 1)) {
    hardFailures.push("MIXED_BUCKET_TARGET_BRANCH");
  }

  const finalStatus: HarvestManifest["final_status"] =
    hardFailures.find((failure) => failure === "UNKNOWN_REQUIRES_HUMAN_REVIEW") ??
    hardFailures.find((failure) => failure === "SECRET_RISK_IN_HARVEST_FILE") ??
    hardFailures.find((failure) => failure === "MIXED_BUCKET_TARGET_BRANCH") ??
    "READY_PARKED_WIP_HARVEST_MANIFEST";

  return {
    wave: "S_PARKED_WIP_HARVEST_AND_BRANCH_SPLIT_POINT_OF_NO_RETURN",
    final_status: finalStatus,
    source_branch: git(["branch", "--show-current"]),
    source_head: git(["rev-parse", "HEAD"]),
    generated_at: new Date().toISOString(),
    items: items.sort((left, right) => left.path.localeCompare(right.path)),
    bucket_counts: bucketCounts,
    hard_failures: hardFailures,
    fake_green_claimed: false,
  };
}

const manifest = buildManifest();
const outputPath = path.join(process.cwd(), "artifacts", "S_PARKED_WIP_HARVEST", "harvest_manifest.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(manifest.final_status);
if (manifest.final_status !== "READY_PARKED_WIP_HARVEST_MANIFEST") {
  process.exitCode = 1;
}
