import { AI_ACTION_LEDGER_BFF_CONTRACT } from "../actionLedger/aiActionLedgerBff";
import { AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT } from "../agent/agentDocumentKnowledgeContracts";
import {
  listAiScreenButtonRoleActionEntries,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type {
  AiScreenButtonActionEntry,
  AiScreenButtonActionKind,
  AiScreenMutationRisk,
  AiScreenRouteStatus,
} from "../screenAudit/aiScreenButtonRoleActionTypes";

export const AI_DOCUMENT_ROUTE_CLOSEOUT_WAVE = "S_AI_DOCUMENTS_01_DOCUMENT_KNOWLEDGE_ROUTE_CLOSEOUT" as const;
export const AI_DOCUMENT_ROUTE_GREEN_STATUS = "GREEN_AI_DOCUMENT_KNOWLEDGE_ROUTE_READY" as const;
export const AI_DOCUMENT_ROUTE_MISSING_BLOCKER = "BLOCKED_DOCUMENTS_MAIN_ROUTE_NOT_REGISTERED" as const;
export const AI_DOCUMENT_EVIDENCE_ROUTE_MISSING_BLOCKER = "BLOCKED_AI_DOCUMENT_EVIDENCE_ROUTE_MISSING" as const;

export type AiDocumentKnowledgeRouteFinalStatus =
  | typeof AI_DOCUMENT_ROUTE_GREEN_STATUS
  | typeof AI_DOCUMENT_ROUTE_MISSING_BLOCKER
  | typeof AI_DOCUMENT_EVIDENCE_ROUTE_MISSING_BLOCKER;

export type AiDocumentCanonicalAliasKind = "bff_document_knowledge_alias";
export type AiDocumentMissingRouteDisposition = "covered_by_canonical_alias" | "exact_blocker";

export type AiDocumentRouteActionCoverage = {
  actionId: string;
  actionKind: AiScreenButtonActionKind;
  mutationRisk: AiScreenMutationRisk;
  coveredBy: readonly string[];
  documentedMissingRoutes: readonly string[];
  forbiddenRouteSentinels: readonly string[];
  safeReadOnly: boolean;
  draftOnly: boolean;
  approvalRequired: boolean;
  finalExecutionAllowed: false;
};

export type AiDocumentRouteMissingRouteRecord = {
  route: string;
  disposition: AiDocumentMissingRouteDisposition;
  replacementRoutes: readonly string[];
  exactReason: string;
};

export type AiDocumentRouteRegistryEntry = {
  wave: typeof AI_DOCUMENT_ROUTE_CLOSEOUT_WAVE;
  screenId: "documents.main";
  auditRoute: "/documents";
  auditRouteStatus: AiScreenRouteStatus;
  uiRouteRegistered: false;
  routeRegisteredOrAliased: boolean;
  canonicalAliasId: "agent.documents.knowledge";
  canonicalAliasKind: AiDocumentCanonicalAliasKind;
  backingAppRoutes: readonly string[];
  requiredBffRoutes: readonly string[];
  mountedKnowledgeRoutes: readonly string[];
  approvalBffRoute: typeof AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint;
  documentedMissingRoutes: readonly AiDocumentRouteMissingRouteRecord[];
  actions: readonly AiDocumentRouteActionCoverage[];
  noUiRewrite: true;
  noSigning: true;
  noFinalSubmit: true;
  noDocumentDeletion: true;
  noFakeDocuments: true;
  noDirectDatabaseAccess: true;
  providerCalled: false;
};

export type AiDocumentRouteRegistrySummary = {
  finalStatus: AiDocumentKnowledgeRouteFinalStatus;
  exactReason: string | null;
  screenId: "documents.main";
  auditRoute: "/documents";
  uiRouteRegistered: false;
  documentsMainRouteClosedByCanonicalAlias: boolean;
  routeRegisteredOrAliased: boolean;
  canonicalAliasReady: boolean;
  requiredBffRoutesCovered: boolean;
  safeReadCovered: boolean;
  draftCovered: boolean;
  approvalCovered: boolean;
  forbiddenCovered: boolean;
  documentedContextRouteGap: boolean;
  noUiRewrite: true;
  noSigning: true;
  noFinalSubmit: true;
  noDocumentDeletion: true;
  noFakeDocuments: true;
  noDirectDatabaseAccess: true;
  providerCalled: false;
  requiredBffRoutes: readonly string[];
  documentedMissingRoutes: readonly string[];
  actionIds: readonly string[];
};

const DOCUMENTS_MAIN_SCREEN_ID = "documents.main" as const;
const DOCUMENTS_MAIN_AUDIT_ROUTE = "/documents" as const;
const DOCUMENT_CONTEXT_ROUTE = "GET /agent/documents/:documentId/context" as const;
const FORBIDDEN_FINAL_MUTATION_SENTINEL = "NO_ROUTE_ALLOWED:documents.main:direct-final-mutation" as const;

const DOCUMENT_KNOWLEDGE_BACKING_APP_ROUTES = Object.freeze([
  "/ai-command-center",
  "/reports/dashboard",
  "/reports/ai-assistant",
  "/pdf-viewer",
] as const);

const DOCUMENT_KNOWLEDGE_BFF_ROUTES = Object.freeze([
  ...AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT.endpoints,
  AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint,
] as const);

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function documentsMainAuditEntries(): AiScreenButtonActionEntry[] {
  return listAiScreenButtonRoleActionEntries().filter((entry) => entry.screenId === DOCUMENTS_MAIN_SCREEN_ID);
}

function routesForAction(entry: AiScreenButtonActionEntry): string[] {
  return uniqueSorted(
    entry.existingBffRoutes.filter((route) => DOCUMENT_KNOWLEDGE_BFF_ROUTES.includes(route as never)),
  );
}

function buildActionCoverage(entry: AiScreenButtonActionEntry): AiDocumentRouteActionCoverage {
  const forbiddenRouteSentinels = entry.missingBffRoutes.filter((route) =>
    route.startsWith("NO_ROUTE_ALLOWED:"),
  );
  return {
    actionId: entry.actionId,
    actionKind: entry.actionKind,
    mutationRisk: entry.mutationRisk,
    coveredBy: routesForAction(entry),
    documentedMissingRoutes: uniqueSorted(
      entry.missingBffRoutes.filter((route) => !route.startsWith("NO_ROUTE_ALLOWED:")),
    ),
    forbiddenRouteSentinels: uniqueSorted(forbiddenRouteSentinels),
    safeReadOnly: entry.actionKind === "safe_read",
    draftOnly: entry.actionKind === "draft_only",
    approvalRequired: entry.actionKind === "approval_required",
    finalExecutionAllowed: false,
  };
}

function buildRegistryEntry(): AiDocumentRouteRegistryEntry {
  const entries = documentsMainAuditEntries();
  const routeStatus = entries[0]?.routeStatus ?? "route_missing_or_not_registered";
  return {
    wave: AI_DOCUMENT_ROUTE_CLOSEOUT_WAVE,
    screenId: DOCUMENTS_MAIN_SCREEN_ID,
    auditRoute: DOCUMENTS_MAIN_AUDIT_ROUTE,
    auditRouteStatus: routeStatus,
    uiRouteRegistered: false,
    routeRegisteredOrAliased: true,
    canonicalAliasId: "agent.documents.knowledge",
    canonicalAliasKind: "bff_document_knowledge_alias",
    backingAppRoutes: DOCUMENT_KNOWLEDGE_BACKING_APP_ROUTES,
    requiredBffRoutes: DOCUMENT_KNOWLEDGE_BFF_ROUTES,
    mountedKnowledgeRoutes: AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT.endpoints,
    approvalBffRoute: AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint,
    documentedMissingRoutes: [
      {
        route: DOCUMENT_CONTEXT_ROUTE,
        disposition: "covered_by_canonical_alias",
        replacementRoutes: [
          "GET /agent/documents/knowledge",
          "POST /agent/documents/search",
          "POST /agent/documents/summarize-preview",
        ],
        exactReason:
          "documents.main has no standalone UI route; document context is resolved through role-scoped knowledge/search/summary-preview BFF routes.",
      },
    ],
    actions: entries.map(buildActionCoverage),
    noUiRewrite: true,
    noSigning: true,
    noFinalSubmit: true,
    noDocumentDeletion: true,
    noFakeDocuments: true,
    noDirectDatabaseAccess: true,
    providerCalled: false,
  };
}

export const AI_DOCUMENT_ROUTE_REGISTRY: readonly AiDocumentRouteRegistryEntry[] = Object.freeze([
  Object.freeze(buildRegistryEntry()),
]);

export function listAiDocumentRouteRegistryEntries(): AiDocumentRouteRegistryEntry[] {
  return [...AI_DOCUMENT_ROUTE_REGISTRY];
}

export function getAiDocumentRouteRegistryEntry(screenId = DOCUMENTS_MAIN_SCREEN_ID): AiDocumentRouteRegistryEntry | null {
  return AI_DOCUMENT_ROUTE_REGISTRY.find((entry) => entry.screenId === screenId) ?? null;
}

function hasActionKind(entry: AiDocumentRouteRegistryEntry, actionKind: AiScreenButtonActionKind): boolean {
  return entry.actions.some((action) => action.actionKind === actionKind);
}

export function verifyAiDocumentRouteRegistry(): AiDocumentRouteRegistrySummary {
  const entry = getAiDocumentRouteRegistryEntry();
  if (!entry) {
    return {
      finalStatus: AI_DOCUMENT_ROUTE_MISSING_BLOCKER,
      exactReason: "documents.main is missing from the AI document route registry.",
      screenId: DOCUMENTS_MAIN_SCREEN_ID,
      auditRoute: DOCUMENTS_MAIN_AUDIT_ROUTE,
      uiRouteRegistered: false,
      documentsMainRouteClosedByCanonicalAlias: false,
      routeRegisteredOrAliased: false,
      canonicalAliasReady: false,
      requiredBffRoutesCovered: false,
      safeReadCovered: false,
      draftCovered: false,
      approvalCovered: false,
      forbiddenCovered: false,
      documentedContextRouteGap: false,
      noUiRewrite: true,
      noSigning: true,
      noFinalSubmit: true,
      noDocumentDeletion: true,
      noFakeDocuments: true,
      noDirectDatabaseAccess: true,
      providerCalled: false,
      requiredBffRoutes: [],
      documentedMissingRoutes: [],
      actionIds: [],
    };
  }

  const requiredBffRoutesCovered = DOCUMENT_KNOWLEDGE_BFF_ROUTES.every((route) =>
    entry.requiredBffRoutes.includes(route),
  );
  const safeReadCovered = entry.actions.some(
    (action) => action.actionKind === "safe_read" && action.coveredBy.includes("GET /agent/documents/knowledge"),
  );
  const draftCovered = entry.actions.some(
    (action) =>
      action.actionKind === "draft_only" &&
      action.coveredBy.includes("POST /agent/documents/search") &&
      action.coveredBy.includes("POST /agent/documents/summarize-preview"),
  );
  const approvalCovered = entry.actions.some(
    (action) =>
      action.actionKind === "approval_required" &&
      action.coveredBy.includes(AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint),
  );
  const forbiddenCovered = entry.actions.some((action) =>
    action.forbiddenRouteSentinels.includes(FORBIDDEN_FINAL_MUTATION_SENTINEL),
  );
  const canonicalAliasReady =
    entry.uiRouteRegistered === false &&
    entry.routeRegisteredOrAliased &&
    entry.canonicalAliasId === "agent.documents.knowledge" &&
    requiredBffRoutesCovered &&
    entry.documentedMissingRoutes.some(
      (record) => record.route === DOCUMENT_CONTEXT_ROUTE && record.disposition === "covered_by_canonical_alias",
    );
  const actionsComplete =
    hasActionKind(entry, "safe_read") &&
    hasActionKind(entry, "draft_only") &&
    hasActionKind(entry, "approval_required") &&
    hasActionKind(entry, "forbidden");
  const finalStatus =
    canonicalAliasReady && actionsComplete && safeReadCovered && draftCovered && approvalCovered && forbiddenCovered
      ? AI_DOCUMENT_ROUTE_GREEN_STATUS
      : AI_DOCUMENT_EVIDENCE_ROUTE_MISSING_BLOCKER;

  return {
    finalStatus,
    exactReason:
      finalStatus === AI_DOCUMENT_ROUTE_GREEN_STATUS
        ? null
        : "documents.main route closeout is missing canonical alias, BFF coverage, or forbidden final-mutation sentinel.",
    screenId: entry.screenId,
    auditRoute: entry.auditRoute,
    uiRouteRegistered: false,
    documentsMainRouteClosedByCanonicalAlias: canonicalAliasReady,
    routeRegisteredOrAliased: entry.routeRegisteredOrAliased,
    canonicalAliasReady,
    requiredBffRoutesCovered,
    safeReadCovered,
    draftCovered,
    approvalCovered,
    forbiddenCovered,
    documentedContextRouteGap: entry.documentedMissingRoutes.some((record) => record.route === DOCUMENT_CONTEXT_ROUTE),
    noUiRewrite: true,
    noSigning: true,
    noFinalSubmit: true,
    noDocumentDeletion: true,
    noFakeDocuments: true,
    noDirectDatabaseAccess: true,
    providerCalled: false,
    requiredBffRoutes: entry.requiredBffRoutes,
    documentedMissingRoutes: entry.documentedMissingRoutes.map((record) => record.route),
    actionIds: entry.actions.map((action) => action.actionId),
  };
}
