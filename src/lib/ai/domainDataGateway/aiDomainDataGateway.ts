import { approvalDomainProvider } from "./providers/approvalDomainProvider";
import { clientDomainProvider } from "./providers/clientDomainProvider";
import { contractorDomainProvider } from "./providers/contractorDomainProvider";
import { consumerRepairDomainProvider } from "./providers/consumerRepairDomainProvider";
import { documentDomainProvider } from "./providers/documentDomainProvider";
import { fieldDomainProvider } from "./providers/fieldDomainProvider";
import { financeDomainProvider } from "./providers/financeDomainProvider";
import { marketplaceDomainProvider } from "./providers/marketplaceDomainProvider";
import { mediaDomainProvider } from "./providers/mediaDomainProvider";
import { officeDomainProvider } from "./providers/officeDomainProvider";
import { procurementDomainProvider } from "./providers/procurementDomainProvider";
import { warehouseDomainProvider } from "./providers/warehouseDomainProvider";
import { applyAiContextBudgetToBundle } from "../contextBudget";
import { sanitizeAiDomainContextBundle } from "../sourceSanitizer";
import {
  createAiDomainSafeStatus,
  mergeAiDomainStatus,
  type AiDomainContextBundle,
  type AiDomainOpenLink,
  type AiDomainQueryResult,
  type AiDomainSourceRef,
} from "./aiDomainContextBundle";
import { assertAiDomainContextBundleSafe } from "./aiDomainGatewayGuard";
import { buildAiGatewayCrossDomainChain } from "./aiDomainLinkResolver";
import { mergeAiDomainNumericFacts } from "./aiDomainNumericFacts";
import { buildAiDomainPermissionScope, canAiDomainScopeAccessDomain } from "./aiDomainPermissionScope";
import { createAiDomainProviderRegistry, type AiDomainProvider, type AiDomainProviderRegistry } from "./aiDomainProviderContract";
import { createPermissionLimitedAiDomainResult } from "./aiDomainReadModel";
import { validateAiDomainQueryBounds } from "./aiDomainQueryBoundsPolicy";
import { createAiDomainQueryId, type AiDomainEntity, type AiDomainGatewayRequest, type AiDomainName, type AiDomainQuery, type AiDomainQueryKind } from "./aiDomainQueryTypes";

export function getDefaultAiDomainProviders(): AiDomainProvider[] {
  return [
    procurementDomainProvider,
    warehouseDomainProvider,
    financeDomainProvider,
    fieldDomainProvider,
    documentDomainProvider,
    mediaDomainProvider,
    marketplaceDomainProvider,
    contractorDomainProvider,
    officeDomainProvider,
    clientDomainProvider,
    approvalDomainProvider,
    consumerRepairDomainProvider,
  ];
}

export function createDefaultAiDomainProviderRegistry(): AiDomainProviderRegistry {
  return createAiDomainProviderRegistry(getDefaultAiDomainProviders());
}

function normalizeEntity(entity: string): AiDomainEntity {
  const allowed: AiDomainEntity[] = [
    "procurement_request",
    "warehouse_stock",
    "warehouse_issue",
    "payment",
    "invoice",
    "act",
    "document",
    "pdf_document",
    "media_asset",
    "work",
    "task",
    "material",
    "supplier",
    "contractor",
    "marketplace_product",
    "approval",
    "consumer_repair_request",
    "consumer_repair_pdf",
    "client_project",
    "unknown",
  ];
  return allowed.includes(entity as AiDomainEntity) ? entity as AiDomainEntity : "unknown";
}

function chooseQueryKind(provider: AiDomainProvider, requestedKinds: readonly AiDomainQueryKind[]): AiDomainQueryKind {
  const preferred = requestedKinds.find((kind) => provider.capabilities.includes(kind));
  return preferred ?? provider.capabilities[0] ?? "detail";
}

function buildQuery(
  request: AiDomainGatewayRequest,
  domain: AiDomainName,
  provider: AiDomainProvider,
): AiDomainQuery {
  const kind = chooseQueryKind(provider, request.requiredQueryKinds);
  return {
    id: createAiDomainQueryId(request.requestId, domain, kind),
    domain,
    kind,
    role: request.role,
    userId: request.userId,
    orgId: request.orgId,
    projectId: request.projectId,
    screenId: request.screenId,
    entity: normalizeEntity(request.entity),
    filters: request.filters,
    bounds: {
      limit: request.maxResultsPerDomain,
      requireCountQuery: kind === "count",
      requireRoleScope: true,
      requireOrgScope: true,
    },
    reasonRu: request.reasonRu,
  };
}

function uniqueSourceRefs(results: readonly AiDomainQueryResult[]): AiDomainSourceRef[] {
  const byId = new Map<string, AiDomainSourceRef>();
  for (const result of results) {
    for (const ref of result.sourceRefs) byId.set(ref.id, ref);
  }
  return [...byId.values()];
}

function uniqueOpenLinks(results: readonly AiDomainQueryResult[]): AiDomainOpenLink[] {
  const byId = new Map<string, AiDomainOpenLink>();
  for (const result of results) {
    for (const link of result.openLinks) byId.set(link.sourceRefId, link);
  }
  return [...byId.values()];
}

function buildBundle(request: AiDomainGatewayRequest, domainResults: AiDomainQueryResult[]): AiDomainContextBundle {
  const bundle: AiDomainContextBundle = {
    requestId: request.requestId,
    role: request.role,
    screenId: request.screenId,
    status: mergeAiDomainStatus(domainResults),
    domainResults,
    mergedNumericFacts: mergeAiDomainNumericFacts(domainResults.map((result) => result.numericFacts)),
    mergedFacts: domainResults.flatMap((result) =>
      result.facts.map((fact) => ({
        textRu: fact.textRu,
        sourceRefIds: fact.sourceRefIds,
        status: fact.status === "draft" ? "found" : fact.status,
      })),
    ),
    mergedSourceRefs: uniqueSourceRefs(domainResults),
    mergedOpenLinks: uniqueOpenLinks(domainResults),
    crossDomainChain: buildAiGatewayCrossDomainChain(),
    missingData: [...new Set(domainResults.flatMap((result) => result.missingData))],
    permissionLimits: domainResults.flatMap((result) => result.permissionLimits),
    checkedSources: domainResults.flatMap((result) => result.checkedSources),
    nextRetrievalHints: [],
    safety: createAiDomainSafeStatus(),
  };

  const sanitizedBundle = sanitizeAiDomainContextBundle(bundle);
  const budgetedBundle = applyAiContextBudgetToBundle(sanitizedBundle);
  const guard = assertAiDomainContextBundleSafe(budgetedBundle);
  if (!guard.passed) {
    return {
      ...budgetedBundle,
      status: "failed",
      missingData: [...budgetedBundle.missingData, ...guard.failureReasons],
    };
  }

  return budgetedBundle;
}

export async function executeAiDomainGatewayRequest(
  request: AiDomainGatewayRequest,
  registry: AiDomainProviderRegistry = createDefaultAiDomainProviderRegistry(),
): Promise<AiDomainContextBundle> {
  const permissionScope = buildAiDomainPermissionScope(request);
  const domainResults: AiDomainQueryResult[] = [];

  for (const domain of request.sourcePlanDomains) {
    const provider = registry.getProvider(domain);
    if (!provider) continue;

    const query = buildQuery(request, domain, provider);
    const bounds = validateAiDomainQueryBounds(query);
    if (!bounds.passed) {
      domainResults.push(
        createPermissionLimitedAiDomainResult({
          queryId: query.id,
          domain,
          hiddenSourceType: "bounded_gateway_query",
          reasonRu: `Gateway query blocked: ${bounds.failures.join(", ")}`,
        }),
      );
      continue;
    }

    if (!canAiDomainScopeAccessDomain(permissionScope, domain)) {
      domainResults.push(
        createPermissionLimitedAiDomainResult({
          queryId: query.id,
          domain,
          hiddenSourceType: domain,
          reasonRu: "Данные скрыты по правам роли.",
        }),
      );
      continue;
    }

    if (!provider.canHandle(query)) continue;
    domainResults.push(await provider.execute(query));
  }

  return buildBundle(request, domainResults);
}
