import type { MediaPurpose } from "../mediaTypes";

export type MediaAiAnalysis = {
  id: string;
  mediaAssetId: string;
  analysisKind:
    | "construction_evidence"
    | "marketplace_product"
    | "warehouse_event"
    | "document_scan"
    | "defect_or_remark"
    | "client_progress"
    | "unknown";
  analyzedAt: string;
  confidence: "high" | "medium" | "low";
  detectedObjects: {
    labelRu: string;
    category:
      | "construction_material"
      | "tool"
      | "equipment"
      | "document"
      | "work_area"
      | "defect"
      | "packaging"
      | "vehicle"
      | "other";
    confidence: number;
  }[];
  suggestedLinks: {
    targetType:
      | "work"
      | "object"
      | "floor"
      | "zone"
      | "request"
      | "product"
      | "marketplace_offer"
      | "warehouse_incoming"
      | "warehouse_issue"
      | "document"
      | "act"
      | "report"
      | "remark"
      | "payment"
      | "invoice";
    targetId: string;
    labelRu: string;
    reasonRu: string;
    confidence: number;
    finalLinkAllowed: false;
    requiresHumanConfirm: true;
  }[];
  extractedText?: {
    textRu?: string;
    rawText?: string;
    confidence: number;
    containsSensitiveInfo?: boolean;
  };
  videoAnalysis?: {
    sampledFrames: {
      frameIndex: number;
      timestampMs: number;
      mediaVariantRef?: string;
      summaryRu: string;
    }[];
    motionSummaryRu?: string;
    durationMs: number;
    frameCountAnalyzed: number;
  };
  productSuggestion?: {
    titleRu?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    specificationText?: string;
    unit?: string;
    missingData: (
      | "price"
      | "availability"
      | "supplier"
      | "brand"
      | "model"
      | "size"
      | "unit"
      | "certificate"
      | "stock"
    )[];
    mustReview: true;
  };
  constructionSuggestion?: {
    workTypeRu?: string;
    evidenceType: "before" | "after" | "progress" | "defect" | "unknown";
    possibleIssuesRu: string[];
    missingData: string[];
    mustReview: true;
  };
  warehouseSuggestion?: {
    eventType: "incoming" | "issue" | "discrepancy" | "unknown";
    materialGuessRu?: string;
    quantityGuess?: string;
    quantityIsFact: false;
    missingData: string[];
    mustReview: true;
  };
  documentSuggestion?: {
    documentType?: "invoice" | "act" | "contract" | "delivery_note" | "report" | "unknown";
    numberGuess?: string;
    amountGuess?: string;
    companyGuess?: string;
    mustReview: true;
  };
  safetyFlags: (
    | "low_confidence"
    | "possible_wrong_link"
    | "contains_people"
    | "contains_private_document"
    | "contains_sensitive_info"
    | "needs_moderation"
    | "possible_document_scan"
    | "possible_face_present"
  )[];
  finalFact: false;
};

export type MediaAiAnalysisPlan = {
  mediaAssetId: string;
  purpose: MediaPurpose;
  analysisKind: MediaAiAnalysis["analysisKind"];
  requiresExternalKnowledge: boolean;
  requiresHumanReview: true;
  finalFact: false;
};

export type MediaAiSafetyGuardResult = {
  mediaAssetId: string;
  passed: boolean;
  finalFact: false;
  faceIdentificationAttempted: false;
  didNotInventProduct: boolean;
  didNotInventPrice: boolean;
  didNotInventAvailability: boolean;
  didNotInventQuantity: boolean;
  didNotMutateWork: boolean;
  didNotMutateStock: boolean;
  didNotPublishProduct: boolean;
  didNotFinalLinkDocument: boolean;
  roleScopePassed: boolean;
  failureReason?:
    | "face_identification_attempted"
    | "invented_product"
    | "invented_price"
    | "invented_availability"
    | "invented_quantity"
    | "ai_claimed_final_fact"
    | "work_status_mutated"
    | "stock_mutated"
    | "product_published"
    | "document_final_linked"
    | "cross_role_media_leak"
    | "signed_url_leaked"
    | "storage_key_leaked"
    | "raw_payload_leaked";
};
