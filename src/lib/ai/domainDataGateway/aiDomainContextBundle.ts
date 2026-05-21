import type { AiDomainNumericFact } from "./aiDomainNumericFacts";
import type { AiDomainName } from "./aiDomainQueryTypes";

export type AiDomainQueryStatus =
  | "found"
  | "checked_empty"
  | "permission_limited"
  | "partial"
  | "failed";

export type AiDomainFactStatus =
  | "found"
  | "missing"
  | "risk"
  | "blocked"
  | "draft"
  | "checked_empty";

export type AiDomainSourceOrigin =
  | "app_data"
  | "document_asset"
  | "pdf_document"
  | "document_chunk"
  | "media_asset"
  | "warehouse"
  | "finance"
  | "procurement"
  | "field"
  | "documents"
  | "marketplace"
  | "consumer_repair"
  | "approval"
  | "office";

export type AiDomainSourceRef = {
  id: string;
  origin: AiDomainSourceOrigin;
  entityType: string;
  entityId: string;
  labelRu: string;
  appLink?: {
    route: string;
    params: Record<string, string>;
    page?: number;
    chunkId?: string;
    highlightText?: string;
  };
  permission: {
    canOpen: boolean;
    reasonRu?: string;
  };
  canBePresentedAsFact: boolean;
  requiresReview: boolean;
};

export type AiDomainOpenLink = {
  labelRu: string;
  sourceRefId: string;
  enabled: boolean;
  route?: string;
  disabledReasonRu?: string;
};

export type AiDomainQueryResult = {
  queryId: string;
  domain: AiDomainName;
  status: AiDomainQueryStatus;
  summaryRu: string;
  numericFacts: AiDomainNumericFact[];
  facts: {
    textRu: string;
    sourceRefIds: string[];
    status: AiDomainFactStatus;
  }[];
  sourceRefs: AiDomainSourceRef[];
  openLinks: AiDomainOpenLink[];
  linkedObjectRefs: string[];
  missingData: string[];
  permissionLimits: {
    hiddenSourceType: string;
    reasonRu: string;
  }[];
  checkedSources: {
    sourceRu: string;
    status: "used" | "checked_empty" | "permission_limited";
  }[];
  freshness: {
    asOf: string;
    stale: boolean;
    reasonRu?: string;
  };
  safety: {
    changedData: false;
    finalSubmit: false;
    dangerousMutation: false;
  };
};

export type AiDomainContextBundle = {
  requestId: string;
  role: string;
  screenId: string;
  status: AiDomainQueryStatus;
  domainResults: AiDomainQueryResult[];
  mergedNumericFacts: AiDomainNumericFact[];
  mergedFacts: {
    textRu: string;
    sourceRefIds: string[];
    status: "found" | "missing" | "risk" | "blocked" | "checked_empty";
  }[];
  mergedSourceRefs: AiDomainSourceRef[];
  mergedOpenLinks: AiDomainOpenLink[];
  crossDomainChain: {
    stepRu: string;
    domain: AiDomainName;
    sourceRefIds: string[];
    status: "done" | "pending" | "blocked" | "missing";
  }[];
  missingData: string[];
  permissionLimits: AiDomainQueryResult["permissionLimits"];
  checkedSources: AiDomainQueryResult["checkedSources"];
  nextRetrievalHints: {
    domain: AiDomainName;
    reasonRu: string;
  }[];
  safety: {
    changedData: false;
    finalSubmit: false;
    dangerousMutation: false;
  };
};

export function createAiDomainSafeStatus() {
  return {
    changedData: false,
    finalSubmit: false,
    dangerousMutation: false,
  } as const;
}

export function mergeAiDomainStatus(results: readonly AiDomainQueryResult[]): AiDomainQueryStatus {
  if (results.some((result) => result.status === "found")) return "found";
  if (results.some((result) => result.status === "partial")) return "partial";
  if (results.length > 0 && results.every((result) => result.status === "permission_limited")) {
    return "permission_limited";
  }
  if (results.length > 0 && results.every((result) => result.status === "checked_empty")) {
    return "checked_empty";
  }
  return results.some((result) => result.status === "failed") ? "failed" : "partial";
}
