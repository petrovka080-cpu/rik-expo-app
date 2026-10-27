import type {
  AiExternalKnowledgeSourceRef,
  AiExternalKnowledgeSourceType,
} from "./aiExternalKnowledgeSourceTypes";

export type AiExternalKnowledgeRole =
  | "director"
  | "foreman"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "office"
  | "client"
  | "marketplace_user"
  | "admin";

export type AiExternalKnowledgeIntent =
  | "construction_estimate"
  | "construction_material_calculation"
  | "construction_technology"
  | "construction_norm_reference"
  | "marketplace_supplier_search"
  | "market_price_reference"
  | "accounting_entry_help"
  | "tax_reference"
  | "finance_reference"
  | "document_requirement_reference";

export type AiExternalKnowledgeEntity =
  | "construction_work_type"
  | "material"
  | "supplier"
  | "marketplace_product"
  | "payment"
  | "invoice"
  | "act"
  | "contract"
  | "accounting_entry"
  | "document"
  | "unknown";

export type AiExternalKnowledgeRequest = {
  requestId: string;
  questionRu: string;
  normalizedQuestionRu: string;
  role: AiExternalKnowledgeRole;
  screenId: string;
  intent: AiExternalKnowledgeIntent;
  entity: AiExternalKnowledgeEntity;
  countryCode?: string;
  cityOrRegion?: string;
  currency?: string;
  quantity?: {
    value: number;
    unit: string;
  };
  workType?: string;
  materialNameRu?: string;
  sourcePreference: AiExternalKnowledgeSourceType[];
  maxResults: number;
  internalContextSummaryRu?: string;
  reasonRu: string;
};

export type AiExternalKnowledgeResult = {
  requestId: string;
  sources: AiExternalKnowledgeSourceRef[];
  answerParts: {
    titleRu: string;
    textRu: string;
    sourceRefIds: string[];
    status:
      | "external_reference"
      | "market_reference"
      | "official_reference"
      | "manufacturer_reference"
      | "draft_assumption"
      | "requires_review"
      | "not_found";
  }[];
  assumptions: string[];
  warnings: string[];
  missingData: string[];
  sourceDisclosure: {
    officialSourcesUsed: boolean;
    manufacturerSourcesUsed: boolean;
    marketplaceSourcesUsed: boolean;
    publicWebUsed: boolean;
    generalKnowledgeUsed: boolean;
    controlledExternalSourceUsed: boolean;
  };
  safetyStatus: {
    canBePresentedAsProjectFact: false;
    requiresHumanReview: boolean;
    changedData: false;
    finalSubmit: false;
  };
};
