import { AGENT_BFF_ROUTE_DEFINITIONS } from "../agent/agentBffRouteShell";
import { hasUnsafeDirectClientAccess } from "../screenAudit/aiScreenBffCoverageClassifier";
import {
  listAiScreenButtonRoleActionEntries,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type {
  AiScreenAuditPrimaryDomain,
  AiScreenButtonActionEntry,
} from "../screenAudit/aiScreenButtonRoleActionTypes";
import {
  AI_BFF_ROUTE_COVERAGE_WAVE,
  type AiBffRouteCoverageClassification,
  type AiBffRouteCoverageDomain,
  type AiBffRouteCoverageEntry,
} from "./aiBffRouteCoverageTypes";

const FORBIDDEN_ROUTE_SENTINEL_PREFIX = "NO_ROUTE_ALLOWED:";

export const AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS: readonly AiBffRouteCoverageDomain[] = [
  "procurement",
  "warehouse",
  "finance",
  "director",
  "foreman",
  "contractor",
  "documents",
  "approval",
  "market_external_intel",
] as const;

const mountedAgentBffRouteEndpoints = new Set<string>(
  AGENT_BFF_ROUTE_DEFINITIONS.map((route) => route.endpoint),
);

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function isAiBffForbiddenRouteSentinel(route: string): boolean {
  return route.startsWith(FORBIDDEN_ROUTE_SENTINEL_PREFIX);
}

function mapPrimaryDomainFallback(domain: AiScreenAuditPrimaryDomain): AiBffRouteCoverageDomain {
  if (domain === "procurement") return "procurement";
  if (domain === "warehouse") return "warehouse";
  if (domain === "finance") return "finance";
  if (domain === "documents" || domain === "reports" || domain === "chat" || domain === "map") return "documents";
  if (domain === "marketplace") return "market_external_intel";
  if (domain === "projects" || domain === "subcontracts") return "foreman";
  return "approval";
}

export function mapAiBffRouteCoverageDomain(
  entry: Pick<AiScreenButtonActionEntry, "screenId" | "primaryDomain">,
): AiBffRouteCoverageDomain {
  if (entry.screenId === "director.finance") return "finance";
  if (entry.screenId.startsWith("director.") || entry.screenId === "reports.modal") return "director";
  if (entry.screenId.startsWith("buyer.") || entry.screenId === "procurement.copilot") return "procurement";
  if (entry.screenId.startsWith("warehouse.")) return "warehouse";
  if (entry.screenId.startsWith("accountant.")) return "finance";
  if (entry.screenId.startsWith("foreman.")) return "foreman";
  if (entry.screenId === "contractor.main") return "contractor";
  if (entry.screenId === "documents.main" || entry.screenId === "chat.main") return "documents";
  if (entry.screenId === "market.home" || entry.screenId === "supplier.showcase" || entry.screenId === "map.main") {
    return "market_external_intel";
  }
  if (
    entry.screenId === "approval.inbox" ||
    entry.screenId === "ai.command_center" ||
    entry.screenId === "office.hub" ||
    entry.screenId === "security.screen" ||
    entry.screenId === "screen.runtime"
  ) {
    return "approval";
  }
  return mapPrimaryDomainFallback(entry.primaryDomain);
}

function classifyCoverage(params: {
  entry: AiScreenButtonActionEntry;
  documentedMissingBffRoutes: readonly string[];
  unmountedExistingBffRoutes: readonly string[];
}): AiBffRouteCoverageClassification {
  if (params.entry.actionKind === "forbidden") return "forbidden";
  if (params.documentedMissingBffRoutes.length > 0 || params.unmountedExistingBffRoutes.length > 0) {
    return "missing_but_documented";
  }
  return "covered";
}

function coverageRationale(entry: AiBffRouteCoverageEntry): string {
  if (entry.classification === "forbidden") {
    return "Direct final mutation has an explicit NO_ROUTE_ALLOWED sentinel and must stay outside BFF routing.";
  }
  if (entry.classification === "missing_but_documented") {
    return "Domain-specific BFF endpoint is still missing, but the audited action is classified and documented.";
  }
  return "All audited BFF routes for this action are mounted in the agent BFF route shell.";
}

function buildCoverageEntry(entry: AiScreenButtonActionEntry): AiBffRouteCoverageEntry {
  const existingBffRoutes = uniqueSorted(entry.existingBffRoutes);
  const mountedBffRoutes = existingBffRoutes.filter((route) => mountedAgentBffRouteEndpoints.has(route));
  const unmountedExistingBffRoutes = existingBffRoutes.filter((route) => !mountedAgentBffRouteEndpoints.has(route));
  const documentedMissingBffRoutes = uniqueSorted(
    entry.missingBffRoutes.filter((route) => !isAiBffForbiddenRouteSentinel(route)),
  );
  const forbiddenRouteSentinels = uniqueSorted(
    entry.missingBffRoutes.filter(isAiBffForbiddenRouteSentinel),
  );
  const classification = classifyCoverage({
    entry,
    documentedMissingBffRoutes,
    unmountedExistingBffRoutes,
  });
  const coverageEntry: AiBffRouteCoverageEntry = {
    wave: AI_BFF_ROUTE_COVERAGE_WAVE,
    screenId: entry.screenId,
    routeStatus: entry.routeStatus,
    actionId: entry.actionId,
    actionKind: entry.actionKind,
    roleScope: entry.roleScope,
    auditPrimaryDomain: entry.primaryDomain,
    coverageDomain: mapAiBffRouteCoverageDomain(entry),
    mutationRisk: entry.mutationRisk,
    classification,
    existingBffRoutes,
    mountedBffRoutes,
    unmountedExistingBffRoutes,
    documentedMissingBffRoutes,
    forbiddenRouteSentinels,
    noDirectClientAccess: !hasUnsafeDirectClientAccess(entry),
    evidenceSources: entry.evidenceSources,
    rationale: "",
  };

  return Object.freeze({
    ...coverageEntry,
    rationale: coverageRationale(coverageEntry),
  });
}

export const AI_BFF_ROUTE_COVERAGE_REGISTRY: readonly AiBffRouteCoverageEntry[] = Object.freeze(
  listAiScreenButtonRoleActionEntries().map(buildCoverageEntry),
);

export function listAiBffRouteCoverageEntries(): AiBffRouteCoverageEntry[] {
  return [...AI_BFF_ROUTE_COVERAGE_REGISTRY];
}

export function getAiBffRouteCoverageEntry(actionId: string): AiBffRouteCoverageEntry | null {
  const normalized = String(actionId || "").trim();
  return AI_BFF_ROUTE_COVERAGE_REGISTRY.find((entry) => entry.actionId === normalized) ?? null;
}

export function listAiBffDocumentedMissingRouteEntries(): AiBffRouteCoverageEntry[] {
  return AI_BFF_ROUTE_COVERAGE_REGISTRY.filter((entry) => entry.documentedMissingBffRoutes.length > 0);
}

export function listAiBffForbiddenRouteSentinelEntries(): AiBffRouteCoverageEntry[] {
  return AI_BFF_ROUTE_COVERAGE_REGISTRY.filter((entry) => entry.forbiddenRouteSentinels.length > 0);
}
