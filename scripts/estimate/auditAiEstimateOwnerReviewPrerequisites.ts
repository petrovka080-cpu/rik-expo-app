import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

export const OWNER_REVIEW_DEPENDENCY_ROOT = path.join(
  ".release-runtime",
  "ai-estimate-owner-review-pilot-operating-system",
  "dependencies",
);

export const GREEN_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES =
  "GREEN_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES" as const;
export const STOP_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES =
  "STOP_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES_INCOMPLETE_NO_GREEN" as const;

export type OwnerReviewEvidenceStatus = "green" | "missing" | "not_required";

export type OwnerReviewDependency = {
  layer: string;
  required: boolean;
  latestStatus: string;
  sourceSha: string;
  sourceShaMatchesHead: boolean;
  webEvidence: OwnerReviewEvidenceStatus;
  androidEvidence: OwnerReviewEvidenceStatus;
  blockers: string[];
};

type SummaryLike = Record<string, unknown>;

type DependencySpec = {
  layer: string;
  required: boolean;
  root: string;
  marker: string;
  webRoot?: string;
  webMarker?: string;
  androidRoot?: string;
  androidMarker?: string;
  platformSealField?: string;
};

const PLATFORM_SEAL_ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal");
const PLATFORM_SEAL_MARKER = "GREEN_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL_COMMITTED_NO_RELEASE";

export const OWNER_REVIEW_ALLOWED_DELTA_PREFIXES = [
  "docs/ai-estimate-owner-review/",
  "scripts/estimate/auditAiEstimateOwnerReviewPrerequisites.ts",
  "scripts/estimate/auditAiEstimatePilotOperatingModel.ts",
  "scripts/estimate/auditAiEstimatePilotKpiReadiness.ts",
  "scripts/estimate/auditAiEstimateOwnerReviewPilotOperatingSystem.ts",
  "scripts/e2e/ownerReviewReadinessCore.ts",
  "scripts/e2e/runOwnerReviewReadinessWebSmoke.ts",
  "scripts/e2e/runOwnerReviewReadinessAndroidSmoke.ts",
  "src/lib/platform/aiEstimateBusinessReadinessContract.ts",
  "src/lib/platform/validateAiEstimateBusinessReadiness.ts",
  "src/lib/platform/aiEstimatePilotOperatingModel.ts",
  "src/lib/platform/aiEstimatePilotKpiContract.ts",
  "src/lib/platform/aiEstimateGoNoGoChecklist.ts",
  "src/features/pdf/renderOwnerReviewPacketPdf.ts",
  "src/features/pdf/validateOwnerReviewPacketPdf.ts",
  "src/screens/foreman/ForemanSubcontractTab.sections.tsx",
  "src/screens/foreman/hooks/useForemanSubcontractController.tsx",
  "src/screens/foreman/ForemanSubcontractTab.sections.test.tsx",
  "tests/estimateInfrastructure/ownerReviewDependencyAudit.contract.test.ts",
  "tests/estimateInfrastructure/businessReadinessContract.test.ts",
  "tests/estimateInfrastructure/pilotOperatingModel.contract.test.ts",
  "tests/estimateInfrastructure/pilotKpiReadiness.contract.test.ts",
  "tests/estimateInfrastructure/goNoGoChecklist.contract.test.ts",
  "tests/officeEstimate/ownerReviewPacketPdf.contract.test.ts",
  "tests/architecture/ownerApprovalCannotBeFaked.contract.test.ts",
  "tests/foreman/foremanAiEstimateNoLegacyPicker.test.ts",
];

const DEPENDENCIES: DependencySpec[] = [
  {
    layer: "real-named BOQ",
    required: true,
    root: path.join(".release-runtime", "ai-estimate-real-named-boq-line-items"),
    marker: "GREEN_AI_ESTIMATE_REAL_NAMED",
    webRoot: path.join(".release-runtime", "ai-estimate-real-named-boq-line-items", "web"),
    webMarker: "GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE",
    androidRoot: path.join(".release-runtime", "ai-estimate-real-named-boq-line-items", "android-chrome"),
    androidMarker: "GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE",
    platformSealField: "real_named_boq_green_found",
  },
  {
    layer: "trusted costing pricebook",
    required: true,
    root: path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook"),
    marker: "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK",
    webRoot: path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook", "web"),
    webMarker: "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE",
    androidRoot: path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook", "android-chrome"),
    androidMarker: "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE",
    platformSealField: "trusted_costing_green_found",
  },
  {
    layer: "approved history scaling",
    required: true,
    root: path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "approved-history-scale"),
    marker: "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE",
    platformSealField: "approved_history_scaling_green_found",
  },
  {
    layer: "material quantity accuracy",
    required: true,
    root: path.join(".release-runtime", "ai-estimate-material-quantity-accuracy"),
    marker: "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY",
    webRoot: path.join(".release-runtime", "ai-estimate-material-quantity-accuracy", "web"),
    webMarker: "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE",
    androidRoot: path.join(".release-runtime", "ai-estimate-material-quantity-accuracy", "android-chrome"),
    androidMarker: "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE",
    platformSealField: "material_quantity_accuracy_green_found",
  },
  {
    layer: "foreman materials/subcontracts sync",
    required: true,
    root: path.join(".release-runtime", "ai-estimate-foreman-materials-subcontracts-sync"),
    marker: "GREEN_AI_ESTIMATE_FOREMAN_MATERIALS_SUBCONTRACTS_SYNCED",
    platformSealField: "foreman_sync_green_found",
  },
  {
    layer: "material completeness/no truncation",
    required: false,
    root: path.join(".release-runtime", "ai-estimate-material-completeness"),
    marker: "GREEN_AI_ESTIMATE_MATERIAL_COMPLETENESS",
    webRoot: path.join(".release-runtime", "ai-estimate-material-completeness", "web"),
    webMarker: "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_SMOKE",
    androidRoot: path.join(".release-runtime", "ai-estimate-material-completeness", "android-chrome"),
    androidMarker: "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE",
  },
  {
    layer: "professional package",
    required: false,
    root: path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "pdf-buyer"),
    marker: "GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE",
  },
  {
    layer: "render staging",
    required: false,
    root: path.join(".release-runtime", "ai-estimate-render-staging-production-grade"),
    marker: "GREEN_AI_ESTIMATE_RENDER_STAGING",
  },
];

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return fallback;
  }
}

function gitSucceeds(args: string[]): boolean {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function pathForGit(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function ownerReviewOnlyDeltaAllowed(sourceSha: string, head: string): boolean {
  if (!/^[0-9a-f]{7,40}$/i.test(sourceSha)) return false;
  if (sourceSha === head) return true;
  if (!gitSucceeds(["merge-base", "--is-ancestor", sourceSha, head])) return false;
  const changed = gitOutput(["diff", "--name-only", `${sourceSha}..${head}`])
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return changed.length > 0 && changed.every((file) =>
    OWNER_REVIEW_ALLOWED_DELTA_PREFIXES.some((prefix) => pathForGit(file).startsWith(prefix)),
  );
}

function finalStatus(summary: SummaryLike | null | undefined): string {
  return String(summary?.final_status ?? "");
}

function sourceSha(summary: SummaryLike | null | undefined): string {
  return String(summary?.source_sha ?? "");
}

function latestGreen(root: string, marker: string): { path: string; summary: SummaryLike } | null {
  return newestSummary<SummaryLike>(root, (summary) => finalStatus(summary).includes(marker));
}

function evidenceStatus(root: string | undefined, marker: string | undefined, head: string): OwnerReviewEvidenceStatus {
  if (!root || !marker) return "not_required";
  const summary = latestGreen(root, marker)?.summary ?? null;
  if (!summary) return "missing";
  return ownerReviewOnlyDeltaAllowed(sourceSha(summary), head) ? "green" : "missing";
}

export function buildOwnerReviewDependencies(input: {
  head?: string;
  specs?: readonly DependencySpec[];
  platformSeal?: SummaryLike | null;
} = {}): OwnerReviewDependency[] {
  const head = input.head ?? currentSourceSha();
  const platformSeal = input.platformSeal ?? latestGreen(PLATFORM_SEAL_ROOT, PLATFORM_SEAL_MARKER)?.summary ?? null;
  const platformSealFresh = platformSeal ? ownerReviewOnlyDeltaAllowed(sourceSha(platformSeal), head) : false;
  return (input.specs ?? DEPENDENCIES).map((spec) => {
    const direct = latestGreen(spec.root, spec.marker)?.summary ?? null;
    const platformCovered =
      spec.platformSealField ? platformSealFresh && platformSeal?.[spec.platformSealField] === true : false;
    const acceptedSummary = platformCovered ? platformSeal : direct;
    const latestStatus = direct
      ? finalStatus(direct)
      : platformCovered
        ? String(platformSeal?.final_status ?? "")
        : spec.required
          ? "missing"
          : "not_evaluated";
    const source = sourceSha(acceptedSummary);
    const fresh = acceptedSummary ? ownerReviewOnlyDeltaAllowed(source, head) : false;
    const web = evidenceStatus(spec.webRoot, spec.webMarker, head);
    const android = evidenceStatus(spec.androidRoot, spec.androidMarker, head);
    const requiredEvidenceBlockers = [
      spec.required && spec.webRoot && web !== "green" && !platformCovered
        ? `${spec.layer}:web_evidence_missing_or_stale`
        : "",
      spec.required && spec.androidRoot && android !== "green" && !platformCovered
        ? `${spec.layer}:android_evidence_missing_or_stale`
        : "",
    ].filter(Boolean);
    const blockers = [
      spec.required && !acceptedSummary ? `${spec.layer}:required_green_missing` : "",
      spec.required && acceptedSummary && !fresh ? `${spec.layer}:required_green_stale` : "",
      spec.required && direct && !platformCovered && !ownerReviewOnlyDeltaAllowed(sourceSha(direct), head)
        ? `${spec.layer}:direct_green_stale_without_current_platform_seal`
        : "",
      ...requiredEvidenceBlockers,
    ].filter(Boolean);
    return {
      layer: spec.layer,
      required: spec.required,
      latestStatus,
      sourceSha: source,
      sourceShaMatchesHead: fresh,
      webEvidence: spec.webRoot && platformCovered ? "green" : web,
      androidEvidence: spec.androidRoot && platformCovered ? "green" : android,
      blockers,
    };
  });
}

export function validateOwnerReviewDependencies(dependencies: readonly OwnerReviewDependency[]) {
  const required = dependencies.filter((dependency) => dependency.required);
  const optional = dependencies.filter((dependency) => !dependency.required);
  const staleRequired = dependencies.filter((dependency) =>
    dependency.required && dependency.latestStatus.startsWith("GREEN") && !dependency.sourceShaMatchesHead
  );
  const blockers = [
    ...dependencies.flatMap((dependency) => dependency.blockers),
    ...staleRequired.map((dependency) => `${dependency.layer}:required_green_stale`),
  ];
  const missingOptionalMarked = optional.every((dependency) =>
    dependency.latestStatus !== "missing" && (dependency.latestStatus !== "not_evaluated" || dependency.sourceSha === ""),
  );
  return {
    owner_review_dependency_audit_created: true,
    required_dependencies_checked: required.length >= 5 && required.every((dependency) => dependency.latestStatus !== "missing"),
    stale_required_green_rejected: staleRequired.every((dependency) =>
      blockers.includes(`${dependency.layer}:required_green_stale`),
    ),
    missing_optional_layers_marked_not_evaluated: missingOptionalMarked,
    all_required_dependencies_green: required.every((dependency) =>
      dependency.latestStatus.startsWith("GREEN") && dependency.sourceShaMatchesHead && dependency.blockers.length === 0,
    ),
    blockers,
  };
}

export function auditAiEstimateOwnerReviewPrerequisites() {
  const head = currentSourceSha();
  const dependencies = buildOwnerReviewDependencies({ head });
  const validation = validateOwnerReviewDependencies(dependencies);
  const blockers = validation.blockers;
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES
      : STOP_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES,
    source_sha: head,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...validation,
    dependencies,
    blocking_reasons: blockers,
    owner_approved: false,
    production_release_started: false,
    contract_total_claimed: false,
    public_beta_started: false,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(OWNER_REVIEW_DEPENDENCY_ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimateOwnerReviewPrerequisites.ts")) {
  const result = auditAiEstimateOwnerReviewPrerequisites();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES) process.exitCode = 1;
}
