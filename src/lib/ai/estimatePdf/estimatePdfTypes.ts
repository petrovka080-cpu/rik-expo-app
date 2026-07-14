import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";

export type AiEstimatePdfSourceType =
  | "global_estimate_result"
  | "consumer_repair_draft"
  | "ai_chat_estimate"
  | "photo_repair_estimate";

export type AiEstimatePdfSectionType =
  | "materials"
  | "labor"
  | "equipment"
  | "delivery"
  | "tax"
  | "other";

export type AiEstimatePdfConfidence = "high" | "medium" | "low";

export type AiEstimatePdfSource = {
  sourceType: AiEstimatePdfSourceType;
  sourceId?: string;
  userId?: string;
  structuredEstimate?: GlobalEstimateResult;
  title: string;
  language: string;
  locale: string;
  currency?: string;
  estimate: {
    workTitle: string;
    description?: string;
    sections: {
      title: string;
      type: AiEstimatePdfSectionType;
      rows: {
        rowNumber?: string;
        name: string;
        quantity: number | string;
        unit: string;
        unitLabel?: string | null;
        unitPrice?: number;
        total?: number;
        currency?: string;
        requestItemType?: "work" | "material" | "service" | "document" | "other";
        requestItemSource?: "ai_suggested" | "user_added" | "marketplace" | "reference_price_book" | "catalog_item" | "custom";
        catalogItemId?: string | null;
        selectedCatalogItemId?: string | null;
        materialKey?: string | null;
        rateKey?: string | null;
        catalogBindingStatus?: string | null;
        sourceLabel?: string | null;
        sourceId?: string;
        sourceEvidence?: {
          sourceId: string;
          label: string;
          checkedAt?: string;
          freshness?: string;
          confidence?: AiEstimatePdfConfidence;
          url?: string;
        }[];
        confidence?: AiEstimatePdfConfidence;
      }[];
    }[];
    totals?: {
      materialsTotal?: number;
      laborTotal?: number;
      taxTotal?: number;
      grandTotal?: number;
      currency?: string;
    };
    tax?: {
      label?: string;
      included?: boolean;
      amount?: number;
      warning?: string;
    };
    assumptions: string[];
    costIncreaseFactors: string[];
    clarifyingQuestions: string[];
    sources?: {
      id: string;
      label: string;
      checkedAt?: string;
      url?: string;
    }[];
  };
  attachments?: {
    id: string;
    kind: "photo" | "video" | "document";
    label?: string;
    uri?: string;
  }[];
  createdAt: string;
};

export type AiEstimatePdfAction = {
  id: "make_estimate_pdf" | "save_estimate" | "create_request" | "clarify_estimate";
  label: string;
  visibleWhen: "message_has_estimate_payload";
  payloadRef: {
    estimateId: string;
    sourceType: AiEstimatePdfSourceType;
  };
};

export type AiEstimatePdfConfirmation = {
  title: string;
  workTitle: string;
  rowsPreview: {
    sectionTitle: string;
    rowCount: number;
  }[];
  totals?: AiEstimatePdfSource["estimate"]["totals"];
  contactRequiredForMarketplace: boolean;
  copy: {
    title: string;
    body: string;
    cancelLabel: string;
    createLabel: string;
    createWithoutSendLabel: string;
    addContactLabel: string;
  };
};

export type AiEstimatePdfResult = {
  pdfId: string;
  estimateId?: string;
  sourceType: AiEstimatePdfSourceType;
  status: "created" | "openable" | "failed";
  title: string;
  createdAt: string;
  access: {
    kind: "local-file" | "remote-url" | "signed-url";
    uri: string;
    expiresAt?: string;
  };
  openAction: {
    route: "/pdf-viewer";
    sourceKind: "local-file" | "remote-url" | "signed-url";
  };
};

export type ExistingPdfModelEstimateSupplement = {
  estimateAssumptions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  taxStatus: string;
  sourceConfidence: AiEstimatePdfConfidence;
  sourceLabels: string[];
  sourceEvidenceLabels?: string[];
  safetyMessage?: string;
  originSourceType: AiEstimatePdfSourceType;
};
