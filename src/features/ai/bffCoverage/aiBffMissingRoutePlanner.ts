import {
  AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS,
  listAiBffRouteCoverageEntries,
} from "./aiBffRouteCoverageRegistry";
import {
  AI_BFF_ROUTE_COVERAGE_WAVE,
  type AiBffRouteCoverageDomain,
  type AiBffRouteCoverageEntry,
  type AiBffRouteCoverageRouteDisposition,
} from "./aiBffRouteCoverageTypes";

export type AiBffMissingRoutePlanItem = {
  domain: AiBffRouteCoverageDomain;
  screenId: string;
  actionId: string;
  actionKind: AiBffRouteCoverageEntry["actionKind"];
  route: string;
  disposition: AiBffRouteCoverageRouteDisposition;
  requiresRuntimeRouteNow: false;
  allowsDirectClientAccess: false;
  allowsDbWrite: false;
};

export type AiBffMissingRouteDomainPlan = {
  domain: AiBffRouteCoverageDomain;
  totalItems: number;
  documentedMissingRoutes: number;
  forbiddenRouteSentinels: number;
  items: readonly AiBffMissingRoutePlanItem[];
};

export type AiBffMissingRoutePlan = {
  wave: typeof AI_BFF_ROUTE_COVERAGE_WAVE;
  totalAuditedMissingRoutes: number;
  documentedMissingRouteCount: number;
  forbiddenRouteSentinelCount: number;
  domains: readonly AiBffMissingRouteDomainPlan[];
  allMissingRoutesAccountedFor: boolean;
  routeCreationDeferredToDomainWaves: true;
  directClientAccessAllowed: false;
  dbWritesAllowed: false;
  liveMutationsAdded: false;
};

function missingRouteItemsForEntry(entry: AiBffRouteCoverageEntry): AiBffMissingRoutePlanItem[] {
  return [
    ...entry.documentedMissingBffRoutes.map((route) => ({
      domain: entry.coverageDomain,
      screenId: entry.screenId,
      actionId: entry.actionId,
      actionKind: entry.actionKind,
      route,
      disposition: "documented_missing" as const,
      requiresRuntimeRouteNow: false as const,
      allowsDirectClientAccess: false as const,
      allowsDbWrite: false as const,
    })),
    ...entry.forbiddenRouteSentinels.map((route) => ({
      domain: entry.coverageDomain,
      screenId: entry.screenId,
      actionId: entry.actionId,
      actionKind: entry.actionKind,
      route,
      disposition: "forbidden_no_route_allowed" as const,
      requiresRuntimeRouteNow: false as const,
      allowsDirectClientAccess: false as const,
      allowsDbWrite: false as const,
    })),
  ];
}

function buildDomainPlan(
  domain: AiBffRouteCoverageDomain,
  items: readonly AiBffMissingRoutePlanItem[],
): AiBffMissingRouteDomainPlan {
  const domainItems = items
    .filter((item) => item.domain === domain)
    .sort((first, second) => `${first.screenId}:${first.actionId}:${first.route}`.localeCompare(
      `${second.screenId}:${second.actionId}:${second.route}`,
    ));

  return {
    domain,
    totalItems: domainItems.length,
    documentedMissingRoutes: domainItems.filter((item) => item.disposition === "documented_missing").length,
    forbiddenRouteSentinels: domainItems.filter((item) => item.disposition === "forbidden_no_route_allowed").length,
    items: domainItems,
  };
}

export function planAiBffMissingRoutes(
  entries: readonly AiBffRouteCoverageEntry[] = listAiBffRouteCoverageEntries(),
): AiBffMissingRoutePlan {
  const items = entries.flatMap(missingRouteItemsForEntry);
  const documentedMissingRouteCount = items.filter((item) => item.disposition === "documented_missing").length;
  const forbiddenRouteSentinelCount = items.filter((item) => item.disposition === "forbidden_no_route_allowed").length;

  return {
    wave: AI_BFF_ROUTE_COVERAGE_WAVE,
    totalAuditedMissingRoutes: items.length,
    documentedMissingRouteCount,
    forbiddenRouteSentinelCount,
    domains: AI_BFF_ROUTE_COVERAGE_REQUIRED_DOMAINS.map((domain) => buildDomainPlan(domain, items)),
    allMissingRoutesAccountedFor: entries.every(
      (entry) =>
        entry.documentedMissingBffRoutes.length + entry.forbiddenRouteSentinels.length ===
        items.filter((item) => item.actionId === entry.actionId).length,
    ),
    routeCreationDeferredToDomainWaves: true,
    directClientAccessAllowed: false,
    dbWritesAllowed: false,
    liveMutationsAdded: false,
  };
}
