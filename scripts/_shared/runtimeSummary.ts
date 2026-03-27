import { classifyFailureKind, pickSummaryFailureKind, type RuntimeFailureKind } from "./failureClassifier";

export type RuntimeIssue = {
  platform: "web" | "android" | "ios";
  issue: string;
};

type RuntimePlatformResult = {
  status?: unknown;
  platformSpecificIssues?: unknown;
  iosResidual?: unknown;
  environmentRecoveryUsed?: unknown;
  gmsRecoveryUsed?: unknown;
  anrRecoveryUsed?: unknown;
  blankSurfaceRecovered?: unknown;
  devClientBootstrapRecovered?: unknown;
  failureKind?: unknown;
};

export function createFailurePlatformResult(
  platform: "web" | "android" | "ios",
  error: unknown,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const existingIssues = Array.isArray(extra.platformSpecificIssues)
    ? extra.platformSpecificIssues.map((issue) => String(issue))
    : [];
  const errorText = error instanceof Error ? error.message : String(error ?? `unknown ${platform} error`);
  const issues = existingIssues.length > 0 ? existingIssues : [errorText];
  return {
    status: "failed",
    ...extra,
    platformSpecificIssues: issues,
    failureKind: classifyFailureKind({ error, issues }),
  };
}

export function collectPlatformIssues(
  web: RuntimePlatformResult,
  android: RuntimePlatformResult,
  ios: RuntimePlatformResult,
): RuntimeIssue[] {
  const issues: RuntimeIssue[] = [];
  for (const issue of Array.isArray(web.platformSpecificIssues) ? web.platformSpecificIssues : []) {
    issues.push({ platform: "web", issue: String(issue) });
  }
  for (const issue of Array.isArray(android.platformSpecificIssues) ? android.platformSpecificIssues : []) {
    issues.push({ platform: "android", issue: String(issue) });
  }
  for (const issue of Array.isArray(ios.platformSpecificIssues) ? ios.platformSpecificIssues : []) {
    issues.push({ platform: "ios", issue: String(issue) });
  }
  return issues;
}

export function buildRuntimeSummary(params: {
  web: RuntimePlatformResult;
  android: RuntimePlatformResult;
  ios: RuntimePlatformResult;
  scenariosPassed?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  const { web, android, ios, scenariosPassed, artifacts, extra } = params;
  const platformSpecificIssues = collectPlatformIssues(web, android, ios);
  const iosResidual = typeof ios.iosResidual === "string" ? ios.iosResidual : null;
  const artifactPayload =
    artifacts && typeof artifacts === "object" && !Array.isArray(artifacts)
      ? { ...artifacts }
      : (artifacts ?? null);
  if (artifactPayload && typeof artifactPayload === "object" && !Array.isArray(artifactPayload)) {
    const androidFailure = {
      xmlPath:
        typeof (android as Record<string, unknown>).xmlPath === "string"
          ? (android as Record<string, unknown>).xmlPath
          : null,
      pngPath:
        typeof (android as Record<string, unknown>).pngPath === "string"
          ? (android as Record<string, unknown>).pngPath
          : null,
      stdoutPath:
        typeof (android as Record<string, unknown>).stdoutPath === "string"
          ? (android as Record<string, unknown>).stdoutPath
          : null,
      stderrPath:
        typeof (android as Record<string, unknown>).stderrPath === "string"
          ? (android as Record<string, unknown>).stderrPath
          : null,
      stdoutTail:
        typeof (android as Record<string, unknown>).stdoutTail === "string"
          ? (android as Record<string, unknown>).stdoutTail
          : null,
      stderrTail:
        typeof (android as Record<string, unknown>).stderrTail === "string"
          ? (android as Record<string, unknown>).stderrTail
          : null,
    };
    if (Object.values(androidFailure).some((value) => value != null)) {
      (artifactPayload as Record<string, unknown>).androidFailure = androidFailure;
    }
  }
  const summaryFailureKind =
    pickSummaryFailureKind([
      web as { status?: unknown; failureKind?: unknown },
      android as { status?: unknown; failureKind?: unknown },
      ios as { status?: unknown; failureKind?: unknown },
    ]) ??
    classifyFailureKind({
      issues: platformSpecificIssues.map((entry) => `[${entry.platform}] ${entry.issue}`),
      fallback: null,
    });

  return {
    status:
      web.status === "passed" &&
      android.status === "passed" &&
      (ios.status === "passed" || ios.status === "residual")
        ? "passed"
        : "failed",
    webPassed: web.status === "passed",
    androidPassed: android.status === "passed",
    iosPassed: ios.status === "passed",
    runtimeVerified: web.status === "passed" && android.status === "passed",
    environmentRecoveryUsed: android.environmentRecoveryUsed === true,
    gmsRecoveryUsed: android.gmsRecoveryUsed === true,
    anrRecoveryUsed: android.anrRecoveryUsed === true,
    blankSurfaceRecovered: android.blankSurfaceRecovered === true,
    devClientBootstrapRecovered: android.devClientBootstrapRecovered === true,
    platformSpecificIssues,
    iosResidual,
    failureKind: summaryFailureKind as RuntimeFailureKind | null,
    scenariosPassed: scenariosPassed ?? null,
    artifacts: artifactPayload,
    ...extra,
  };
}
