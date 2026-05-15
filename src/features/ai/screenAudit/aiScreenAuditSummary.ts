import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS,
  listAiScreenButtonRoleActionEntries,
} from "./aiScreenButtonRoleActionRegistry";
import { hasUnsafeDirectClientAccess } from "./aiScreenBffCoverageClassifier";
import type {
  AiScreenAuditSummary,
  AiScreenAuditValidationIssue,
  AiScreenButtonActionEntry,
} from "./aiScreenButtonRoleActionTypes";

function issue(params: AiScreenAuditValidationIssue): AiScreenAuditValidationIssue {
  return params;
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function hasApprovalOrEvidenceRoute(entry: AiScreenButtonActionEntry): boolean {
  return entry.existingBffRoutes.some((route) => /approval|approve|reject|execute|evidence|status/i.test(route));
}

function summarizeIssues(entries: readonly AiScreenButtonActionEntry[]): AiScreenAuditValidationIssue[] {
  const issues: AiScreenAuditValidationIssue[] = [];
  const screenIds = uniqueSorted(entries.map((entry) => entry.screenId));

  for (const screenId of AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS) {
    if (!screenIds.includes(screenId)) {
      issues.push(
        issue({
          code: "MISSING_REQUIRED_SCREEN",
          screenId,
          exactReason: "Required screen is not represented in AI all-screen audit registry.",
        }),
      );
    }
  }

  for (const screenId of screenIds) {
    const seen = new Set<string>();
    for (const entry of entries.filter((candidate) => candidate.screenId === screenId)) {
      if (seen.has(entry.actionId)) {
        issues.push(
          issue({
            code: "DUPLICATE_ACTION_ID_PER_SCREEN",
            screenId,
            actionId: entry.actionId,
            exactReason: "Duplicate actionId appears within a single screen scope.",
          }),
        );
      }
      seen.add(entry.actionId);
    }
  }

  for (const entry of entries) {
    if (entry.roleScope.length === 0) {
      issues.push(
        issue({
          code: "MISSING_ROLE_SCOPE",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Action has no roleScope.",
        }),
      );
    }

    if (!entry.actionKind) {
      issues.push(
        issue({
          code: "MISSING_ACTION_KIND",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Action has no actionKind.",
        }),
      );
    }

    if (entry.actionKind === "unknown_needs_audit") {
      issues.push(
        issue({
          code: "UNKNOWN_ACTION_KIND_NEEDS_AUDIT",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Action remains unknown and must be audited before future AI product work.",
        }),
      );
    }

    if (entry.actionKind === "forbidden" && !entry.forbiddenReason) {
      issues.push(
        issue({
          code: "FORBIDDEN_ACTION_WITHOUT_REASON",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Forbidden action must declare a forbiddenReason.",
        }),
      );
    }

    if (entry.actionKind === "approval_required" && !hasApprovalOrEvidenceRoute(entry)) {
      issues.push(
        issue({
          code: "APPROVAL_REQUIRED_WITHOUT_APPROVAL_OR_EVIDENCE_ROUTE",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Approval-required action has no approval/evidence BFF route.",
        }),
      );
    }

    if (entry.actionKind === "safe_read" && entry.evidenceSources.length === 0) {
      issues.push(
        issue({
          code: "SAFE_READ_WITHOUT_EVIDENCE_SOURCE",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Safe-read action must name evidence source.",
        }),
      );
    }

    if (entry.mutationRisk === "forbidden_direct_mutation" && entry.actionKind !== "forbidden") {
      issues.push(
        issue({
          code: "DIRECT_MUTATION_RISK_NOT_FORBIDDEN",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Direct mutation risk must be classified as forbidden.",
        }),
      );
    }

    if (entry.missingBffRoutes.length > 0 && entry.bffCoverage.length === 0) {
      issues.push(
        issue({
          code: "MISSING_BFF_ROUTE_NOT_REPORTED",
          screenId: entry.screenId,
          actionId: entry.actionId,
          exactReason: "Missing BFF route exists but classifier did not report coverage status.",
        }),
      );
    }
  }

  return issues;
}

export function buildAiScreenAuditSummary(
  entries: readonly AiScreenButtonActionEntry[] = listAiScreenButtonRoleActionEntries(),
): AiScreenAuditSummary {
  const screenIds = uniqueSorted(entries.map((entry) => entry.screenId));
  const rolesCovered = uniqueSorted(entries.flatMap((entry) => [...entry.roleScope])) as AiUserRole[];
  const issues = summarizeIssues(entries);
  const routeMissingScreens = uniqueSorted(
    entries
      .filter((entry) => entry.routeStatus === "route_missing_or_not_registered")
      .map((entry) => entry.screenId),
  );
  const unsafeDirectMutationPaths = entries.filter(
    (entry) => hasUnsafeDirectClientAccess(entry) && entry.mutationRisk !== "none",
  ).length;
  const missingBffRoutes = entries.reduce((sum, entry) => sum + entry.missingBffRoutes.length, 0);

  let finalStatus: AiScreenAuditSummary["finalStatus"] = "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY";
  let exactReason: string | null = null;
  if (issues.length > 0) {
    finalStatus = "BLOCKED_SCREEN_BUTTON_AUDIT_INCOMPLETE";
    exactReason = issues.map((candidate) => `${candidate.code}:${candidate.screenId}`).join("; ");
  } else if (routeMissingScreens.length > 0 && screenIds.length === 0) {
    finalStatus = "BLOCKED_AI_SCREEN_AUDIT_MISSING_ROUTE_REGISTRY";
    exactReason = "No screen audit registry entries were found.";
  }

  return {
    ok: finalStatus === "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY",
    finalStatus,
    exactReason,
    screensAudited: screenIds.length,
    actionsAudited: entries.length,
    rolesCovered,
    safeReadOpportunities: entries.filter((entry) => entry.actionKind === "safe_read").length,
    draftOnlyOpportunities: entries.filter((entry) => entry.actionKind === "draft_only").length,
    approvalRequiredOpportunities: entries.filter((entry) => entry.actionKind === "approval_required").length,
    forbiddenActions: entries.filter((entry) => entry.actionKind === "forbidden").length,
    missingBffRoutes,
    unsafeDirectMutationPaths,
    routeMissingScreens,
    issues,
    fakeAiCardsAdded: false,
    uiChanged: false,
    hooksAdded: false,
    dbWritesUsed: false,
    providerCalled: false,
    secretsPrinted: false,
    rawRowsPrinted: false,
    fakeGreenClaimed: false,
  };
}
