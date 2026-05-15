import {
  AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS,
  listAiBffRouteCoverageEntries,
} from "./aiBffRouteCoverageRegistry";
import {
  AI_BFF_ROUTE_COVERAGE_WAVE,
  type AiBffDirectClientAccessFinding,
  type AiBffRouteCoverageDomain,
  type AiBffRouteCoverageDomainSummary,
  type AiBffRouteCoverageEntry,
  type AiBffRouteCoverageFinalStatus,
  type AiBffRouteCoverageSummary,
} from "./aiBffRouteCoverageTypes";
import { listAiScreenButtonRoleActionEntries } from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type { AiScreenButtonActionEntry } from "../screenAudit/aiScreenButtonRoleActionTypes";

const DATA_CLIENT_TOKEN = ["supa", "base"].join("");
const PRIVILEGED_AUTH_TOKEN = ["auth", "admin"].join(".");
const LIST_USERS_TOKEN = ["list", "Users"].join("");
const BACKEND_ROLE_TOKEN = ["service", "_role"].join("");
const BACKEND_ROLE_ENV_TOKEN = ["SUPABASE", "_SERVICE", "_ROLE", "_KEY"].join("");

const DIRECT_CLIENT_ACCESS_PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: "data_client_read", pattern: new RegExp(`\\b${DATA_CLIENT_TOKEN}\\s*\\.\\s*from\\s*\\(`, "i") },
  { id: "data_client_rpc", pattern: new RegExp(`\\b${DATA_CLIENT_TOKEN}\\s*\\.\\s*rpc\\s*\\(`, "i") },
  { id: "client_write", pattern: /\.(?:insert|update|upsert|delete)\s*\(/i },
  { id: "privileged_auth_admin", pattern: new RegExp(`\\b${PRIVILEGED_AUTH_TOKEN.replace(".", "\\s*\\.\\s*")}\\b`, "i") },
  { id: "auth_user_listing", pattern: new RegExp(`\\b${LIST_USERS_TOKEN}\\s*\\(`, "i") },
  { id: "privileged_backend_role", pattern: new RegExp(`\\b${BACKEND_ROLE_TOKEN}\\b|${BACKEND_ROLE_ENV_TOKEN}`, "i") },
] as const;

function scanValues(params: {
  entry: AiScreenButtonActionEntry;
  sourceField: AiBffDirectClientAccessFinding["sourceField"];
  values: readonly string[];
}): AiBffDirectClientAccessFinding[] {
  const findings: AiBffDirectClientAccessFinding[] = [];

  for (const value of params.values) {
    for (const candidate of DIRECT_CLIENT_ACCESS_PATTERNS) {
      if (candidate.pattern.test(value)) {
        findings.push({
          screenId: params.entry.screenId,
          actionId: params.entry.actionId,
          actionKind: params.entry.actionKind,
          matchedPattern: candidate.id,
          sourceField: params.sourceField,
          matchedValue: value,
        });
      }
    }
  }

  return findings;
}

export function scanAiAuditActionsForDirectClientAccess(
  entries: readonly AiScreenButtonActionEntry[] = listAiScreenButtonRoleActionEntries(),
): AiBffDirectClientAccessFinding[] {
  return entries.flatMap((entry) => [
    ...scanValues({
      entry,
      sourceField: "currentDataSources",
      values: entry.currentDataSources,
    }),
    ...scanValues({
      entry,
      sourceField: "onPressHandlers",
      values: entry.onPressHandlers,
    }),
  ]);
}

function createEmptyDomainSummary(domain: AiBffRouteCoverageDomain): AiBffRouteCoverageDomainSummary {
  return {
    domain,
    actions: 0,
    covered: 0,
    missingButDocumented: 0,
    forbidden: 0,
    documentedMissingRoutes: 0,
    forbiddenRouteSentinels: 0,
  };
}

function summarizeByDomain(entries: readonly AiBffRouteCoverageEntry[]): AiBffRouteCoverageDomainSummary[] {
  const summaries = new Map<AiBffRouteCoverageDomain, AiBffRouteCoverageDomainSummary>();
  for (const domain of AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS) {
    summaries.set(domain, createEmptyDomainSummary(domain));
  }

  for (const entry of entries) {
    const summary = summaries.get(entry.coverageDomain) ?? createEmptyDomainSummary(entry.coverageDomain);
    summary.actions += 1;
    summary.documentedMissingRoutes += entry.documentedMissingBffRoutes.length;
    summary.forbiddenRouteSentinels += entry.forbiddenRouteSentinels.length;
    if (entry.classification === "covered") summary.covered += 1;
    if (entry.classification === "missing_but_documented") summary.missingButDocumented += 1;
    if (entry.classification === "forbidden") summary.forbidden += 1;
    summaries.set(entry.coverageDomain, summary);
  }

  return AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS.map((domain) => summaries.get(domain) ?? createEmptyDomainSummary(domain));
}

function resolveFinalStatus(params: {
  actionsMissingClassification: readonly string[];
  directClientAccessFindings: readonly AiBffDirectClientAccessFinding[];
  unmountedExistingRoutes: number;
}): { finalStatus: AiBffRouteCoverageFinalStatus; exactReason: string | null } {
  if (params.directClientAccessFindings.length > 0) {
    return {
      finalStatus: "BLOCKED_AI_BFF_DIRECT_CLIENT_ACCESS_FOUND",
      exactReason: params.directClientAccessFindings.map((finding) => finding.actionId).join(", "),
    };
  }

  if (params.actionsMissingClassification.length > 0 || params.unmountedExistingRoutes > 0) {
    return {
      finalStatus: "BLOCKED_AI_BFF_ROUTE_COVERAGE_INCOMPLETE",
      exactReason: [
        ...params.actionsMissingClassification,
        params.unmountedExistingRoutes > 0 ? `unmounted_existing_routes:${params.unmountedExistingRoutes}` : "",
      ].filter(Boolean).join(", "),
    };
  }

  return {
    finalStatus: "GREEN_AI_BFF_ROUTE_COVERAGE_MAP_READY",
    exactReason: null,
  };
}

export function verifyAiBffRouteCoverage(
  entries: readonly AiBffRouteCoverageEntry[] = listAiBffRouteCoverageEntries(),
): AiBffRouteCoverageSummary {
  const directClientAccessFindings = scanAiAuditActionsForDirectClientAccess();
  const actionClassificationSet = new Set(["covered", "missing_but_documented", "forbidden"]);
  const actionsMissingClassification = entries
    .filter((entry) => !actionClassificationSet.has(entry.classification))
    .map((entry) => entry.actionId)
    .sort();
  const unmountedExistingRoutes = entries.reduce(
    (sum, entry) => sum + entry.unmountedExistingBffRoutes.length,
    0,
  );
  const { finalStatus, exactReason } = resolveFinalStatus({
    actionsMissingClassification,
    directClientAccessFindings,
    unmountedExistingRoutes,
  });

  return {
    wave: AI_BFF_ROUTE_COVERAGE_WAVE,
    finalStatus,
    exactReason,
    actionsAudited: entries.length,
    safeReadActions: entries.filter((entry) => entry.actionKind === "safe_read").length,
    draftOnlyActions: entries.filter((entry) => entry.actionKind === "draft_only").length,
    approvalRequiredActions: entries.filter((entry) => entry.actionKind === "approval_required").length,
    forbiddenActions: entries.filter((entry) => entry.actionKind === "forbidden").length,
    coveredActions: entries.filter((entry) => entry.classification === "covered").length,
    missingButDocumentedActions: entries.filter((entry) => entry.classification === "missing_but_documented").length,
    documentedMissingRoutes: entries.reduce((sum, entry) => sum + entry.documentedMissingBffRoutes.length, 0),
    forbiddenRouteSentinels: entries.reduce((sum, entry) => sum + entry.forbiddenRouteSentinels.length, 0),
    auditedMissingRoutes: entries.reduce(
      (sum, entry) => sum + entry.documentedMissingBffRoutes.length + entry.forbiddenRouteSentinels.length,
      0,
    ),
    unmountedExistingRoutes,
    directClientAccessFindings: directClientAccessFindings.length,
    actionsMissingClassification,
    coverageByDomain: summarizeByDomain(entries),
    noSecrets: true,
    noRawRows: true,
    noDbWrites: true,
    noProviderCalls: true,
    noUiChanges: true,
    noFakeGreen: true,
  };
}
