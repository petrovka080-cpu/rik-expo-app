export const AI_DOMAIN_DATA_GATEWAY_WAVE =
  "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_RETRIEVAL_ARCHITECTURE_POINT_OF_NO_RETURN" as const;

export const AI_DOMAIN_DATA_GATEWAY_ARTIFACT_PREFIX =
  "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_RETRIEVAL_ARCHITECTURE" as const;

export const AI_DOMAIN_DATA_GATEWAY_GREEN_STATUS =
  "GREEN_AI_DOMAIN_DATA_GATEWAY_CONTEXT_RETRIEVAL_ARCHITECTURE_READY" as const;

export type AiDomainName =
  | "procurement"
  | "warehouse"
  | "finance"
  | "field"
  | "documents"
  | "media"
  | "marketplace"
  | "contractors"
  | "office"
  | "client"
  | "approvals"
  | "consumer_repair";

export const AI_DOMAIN_NAMES: readonly AiDomainName[] = [
  "procurement",
  "warehouse",
  "finance",
  "field",
  "documents",
  "media",
  "marketplace",
  "contractors",
  "office",
  "client",
  "approvals",
  "consumer_repair",
] as const;

export type AiDomainQueryKind =
  | "count"
  | "list"
  | "detail"
  | "trace"
  | "breakdown"
  | "missing_data"
  | "linked_objects"
  | "risk_summary"
  | "draft_context";

export type AiDomainEntity =
  | "procurement_request"
  | "warehouse_stock"
  | "warehouse_issue"
  | "payment"
  | "invoice"
  | "act"
  | "document"
  | "pdf_document"
  | "media_asset"
  | "work"
  | "task"
  | "material"
  | "supplier"
  | "contractor"
  | "marketplace_product"
  | "approval"
  | "consumer_repair_request"
  | "consumer_repair_pdf"
  | "client_project"
  | "unknown";

export type AiDomainQueryFilters = {
  period?: {
    from: string;
    to: string;
    labelRu: string;
  };
  objectId?: string;
  buildingId?: string;
  floorId?: string;
  zoneId?: string;
  workId?: string;
  requestId?: string;
  paymentId?: string;
  documentId?: string;
  mediaAssetId?: string;
  materialNameRu?: string;
  companyId?: string;
  supplierId?: string;
  contractorId?: string;
  status?: string;
};

export type AiDomainQuery = {
  id: string;
  domain: AiDomainName;
  kind: AiDomainQueryKind;
  role: string;
  userId: string;
  orgId: string;
  projectId?: string;
  screenId: string;
  entity: AiDomainEntity;
  filters: AiDomainQueryFilters;
  bounds: {
    limit: number;
    offset?: number;
    requireCountQuery: boolean;
    requireRoleScope: true;
    requireOrgScope: true;
  };
  reasonRu: string;
};

export type AiDomainGatewayRequest = {
  requestId: string;
  role: string;
  userId: string;
  orgId: string;
  projectId?: string;
  screenId: string;
  normalizedQuestionRu: string;
  intent: string;
  entity: string;
  sourcePlanDomains: AiDomainName[];
  filters: AiDomainQueryFilters;
  requiredQueryKinds: AiDomainQueryKind[];
  maxResultsPerDomain: number;
  requireSourceRefs: true;
  requireOpenLinks: true;
  requireNumericFactsWhenAvailable: true;
  reasonRu: string;
};

export function createAiDomainQueryId(
  requestId: string,
  domain: AiDomainName,
  kind: AiDomainQueryKind,
): string {
  return `${requestId}:${domain}:${kind}`;
}
