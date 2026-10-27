export const AI_APP_CONTEXT_GRAPH_WAVE =
  "S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS_POINT_OF_NO_RETURN" as const;

export const AI_APP_CONTEXT_GRAPH_GREEN_STATUS =
  "GREEN_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS_READY" as const;

export type AiAppEntityType =
  | "procurement_request"
  | "procurement_request_line"
  | "purchase_order"
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "warehouse_reservation"
  | "work"
  | "task"
  | "object"
  | "building"
  | "floor"
  | "zone"
  | "material"
  | "marketplace_product"
  | "supplier"
  | "contractor"
  | "payment"
  | "invoice"
  | "act"
  | "contract"
  | "document"
  | "pdf_document"
  | "document_chunk"
  | "report"
  | "approval"
  | "photo"
  | "video"
  | "media_asset"
  | "media_group"
  | "user"
  | "company";

export const AI_APP_ENTITY_TYPES: readonly AiAppEntityType[] = [
  "procurement_request",
  "procurement_request_line",
  "purchase_order",
  "warehouse_stock",
  "warehouse_incoming",
  "warehouse_issue",
  "warehouse_reservation",
  "work",
  "task",
  "object",
  "building",
  "floor",
  "zone",
  "material",
  "marketplace_product",
  "supplier",
  "contractor",
  "payment",
  "invoice",
  "act",
  "contract",
  "document",
  "pdf_document",
  "document_chunk",
  "report",
  "approval",
  "photo",
  "video",
  "media_asset",
  "media_group",
  "user",
  "company",
] as const;

export type AiSourceOrigin =
  | "app_data"
  | "pdf_document"
  | "internal_marketplace"
  | "supplier_history"
  | "warehouse"
  | "finance"
  | "procurement"
  | "field"
  | "documents"
  | "document_asset"
  | "document_chunk"
  | "reports"
  | "media_asset"
  | "external_web"
  | "unknown";

export type AiSourceRef = {
  id: string;
  origin: AiSourceOrigin;
  entityType: AiAppEntityType;
  entityId: string;
  labelRu: string;
  descriptionRu?: string;
  appLink?: {
    route: string;
    params: Record<string, string>;
    anchor?: string;
    page?: number;
    highlightText?: string;
  };
  permission: {
    canOpen: boolean;
    reasonRu?: string;
  };
  evidence?: {
    field?: string;
    valuePreviewRu?: string;
    documentPage?: number;
    documentChunkId?: string;
    confidence?: "high" | "medium" | "low";
  };
  canBePresentedAsFact: boolean;
  requiresReview: boolean;
};

export type AiExternalSourceRef = {
  origin:
    | "public_web"
    | "external_marketplace"
    | "official_regulation"
    | "manufacturer_manual"
    | "accounting_reference"
    | "tax_reference";
  titleRu: string;
  url: string;
  domain: string;
  checkedAt: string;
  topic:
    | "construction"
    | "market_price"
    | "supplier"
    | "accounting"
    | "tax"
    | "finance";
  country?: string;
  confidence: "high" | "medium" | "low";
  canBePresentedAsFact: boolean;
  requiresReview: boolean;
};

export type AiContextGraphRelation =
  | "created_by"
  | "approved_by"
  | "contains"
  | "belongs_to_object"
  | "belongs_to_floor"
  | "for_work"
  | "uses_material"
  | "reserved_from_stock"
  | "issued_from_stock"
  | "purchased_from_supplier"
  | "linked_payment"
  | "linked_invoice"
  | "linked_act"
  | "linked_document"
  | "linked_pdf"
  | "blocks"
  | "blocked_by";

export type AiContextGraphMissingLink =
  | "act"
  | "invoice"
  | "payment"
  | "pdf"
  | "work"
  | "floor"
  | "supplier"
  | "warehouse_issue"
  | "approval";

export type AiContextGraphNode = {
  ref: AiSourceRef;
  titleRu: string;
  facts: {
    key: string;
    valueRu: string;
    sourceRefId: string;
  }[];
  links: {
    relation: AiContextGraphRelation;
    targetRefId: string;
    labelRu: string;
  }[];
  missingLinks: {
    expected: AiContextGraphMissingLink;
    reasonRu: string;
  }[];
};

export type AiContextGraphAnswer = {
  questionRu: string;
  normalizedQuestionRu: string;
  role: string;
  screenId: string;
  answerRu: {
    shortRu: string;
    sections: {
      titleRu: string;
      items: {
        textRu: string;
        sourceRefIds: string[];
        status: "found" | "missing" | "risk" | "blocked" | "checked_empty";
      }[];
    }[];
    openLinks: {
      labelRu: string;
      sourceRefId: string;
      route: string;
      enabled: boolean;
      disabledReasonRu?: string;
    }[];
    chainRu?: {
      stepRu: string;
      sourceRefIds: string[];
    }[];
    missingData: string[];
    nextStepRu: string;
    statusRu:
      | "Данные не изменены"
      | "Черновик подготовлен"
      | "Требуется согласование"
      | "Доступ ограничен";
  };
  sourceRefs: AiSourceRef[];
  safetyStatus: {
    changedData: false;
    draftOnly: boolean;
    approvalRequired: boolean;
    finalSubmit: false;
    dangerousMutation: false;
  };
};

export type AiContextGraphEntityFactInput = {
  key: string;
  valueRu: string;
  sourceRefId?: string;
};

export type AiContextGraphEntityLinkInput = {
  relation: AiContextGraphRelation;
  targetEntityType: AiAppEntityType;
  targetEntityId: string;
  targetRefId?: string;
  labelRu: string;
};

export type AiContextGraphEntityInput = {
  entityType: AiAppEntityType;
  entityId: string;
  labelRu: string;
  titleRu?: string;
  descriptionRu?: string;
  origin?: AiSourceOrigin;
  routeParams?: Record<string, string>;
  appLink?: AiSourceRef["appLink"];
  evidence?: AiSourceRef["evidence"];
  canBePresentedAsFact?: boolean;
  requiresReview?: boolean;
  facts?: AiContextGraphEntityFactInput[];
  links?: AiContextGraphEntityLinkInput[];
  missingLinks?: AiContextGraphNode["missingLinks"];
};

export type AiContextGraphBuildResult = {
  nodes: AiContextGraphNode[];
  sourceRefs: AiSourceRef[];
  externalSourceRefs: AiExternalSourceRef[];
  providerTrace: string[];
};

export function makeAiSourceRefId(entityType: AiAppEntityType, entityId: string): string {
  return `app:${entityType}:${entityId}`;
}

export function normalizeAiQuestionRu(questionRu: string): string {
  return questionRu
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s#№.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueAiSourceRefs(refs: readonly AiSourceRef[]): AiSourceRef[] {
  const seen = new Set<string>();
  const result: AiSourceRef[] = [];
  for (const ref of refs) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    result.push(ref);
  }
  return result;
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function isInternalAiSourceRef(ref: AiSourceRef): boolean {
  return ref.origin !== "external_web" && ref.origin !== "unknown";
}

export function createUnresolvedAiSourceRef(input: AiContextGraphEntityInput): AiSourceRef {
  return {
    id: makeAiSourceRefId(input.entityType, input.entityId),
    origin: input.origin ?? "app_data",
    entityType: input.entityType,
    entityId: input.entityId,
    labelRu: input.labelRu,
    descriptionRu: input.descriptionRu,
    appLink: input.appLink,
    permission: {
      canOpen: false,
      reasonRu: "Ссылка не проверена по правам доступа.",
    },
    evidence: input.evidence,
    canBePresentedAsFact: input.canBePresentedAsFact ?? true,
    requiresReview: input.requiresReview ?? false,
  };
}

export function createAiContextGraphNode(input: AiContextGraphEntityInput, ref: AiSourceRef): AiContextGraphNode {
  const selfFact: AiContextGraphEntityFactInput = {
    key: "label",
    valueRu: input.labelRu,
    sourceRefId: ref.id,
  };
  const facts = [selfFact, ...(input.facts ?? [])].map((fact) => ({
    key: fact.key,
    valueRu: fact.valueRu,
    sourceRefId: fact.sourceRefId ?? ref.id,
  }));

  return {
    ref,
    titleRu: input.titleRu ?? input.labelRu,
    facts,
    links: (input.links ?? []).map((link) => ({
      relation: link.relation,
      targetRefId: link.targetRefId ?? makeAiSourceRefId(link.targetEntityType, link.targetEntityId),
      labelRu: link.labelRu,
    })),
    missingLinks: input.missingLinks ?? [],
  };
}

export function findAiNodeFact(node: AiContextGraphNode, key: string): string | null {
  return node.facts.find((fact) => fact.key === key)?.valueRu ?? null;
}
