import type { ConsumerRepairDraftBundle } from "../../consumerRequests";
import type { GlobalEstimateResult, EstimateRowSourceEvidence } from "../globalEstimate";

export type BuiltInAiScreenContext =
  | "chat"
  | "request"
  | "foreman"
  | "director"
  | "buyer"
  | "warehouse"
  | "accountant"
  | "contractor"
  | "marketplace"
  | "office"
  | "profile"
  | "unknown";

export type BuiltInAiIntent =
  | "estimate"
  | "product_search"
  | "marketplace_lookup"
  | "request_draft"
  | "pdf_action"
  | "role_status_qa"
  | "document_analysis"
  | "photo_repair"
  | "procurement"
  | "general_chat";

export type BuiltInAiConfidence = "high" | "medium" | "low";

export type BuiltInAiToolName =
  | "calculate_global_estimate"
  | "search_material_products"
  | "search_marketplace_products"
  | "create_consumer_repair_draft"
  | "generate_estimate_pdf"
  | "get_screen_context"
  | "get_role_data"
  | "search_documents"
  | "analyze_photo_repair"
  | "create_purchase_list";

export type BuiltInAiIntentRoute = {
  originalText: string;
  screenContext: BuiltInAiScreenContext;
  intent: BuiltInAiIntent;
  confidence: BuiltInAiConfidence;
  mustUseBackendTool: boolean;
  allowedTools: BuiltInAiToolName[];
  forbiddenFallbacks: string[];
  traceId: string;
  workKey?: string;
  category?: string;
  volume?: number;
  unit?: string;
};

export type BuiltInAiInput = {
  text: string;
  screenContext?: BuiltInAiScreenContext | string;
  route?: string;
  role?: string;
  userId?: string | null;
  countryCode?: string;
  cityOrRegion?: string;
};

export type BuiltInAiAction = {
  id:
    | "make_pdf"
    | "save_estimate"
    | "create_request"
    | "clarify_city"
    | "refresh_prices"
    | "create_purchase_list"
    | "save_product_search"
    | "send_to_director";
  labelRu: string;
  toolName?: BuiltInAiToolName;
  visible: boolean;
};

export type BuiltInAiProductCandidate = {
  id: string;
  title: string;
  category: string;
  neededQuantity: number;
  unit: string;
  unitPrice: number | null;
  currency: string;
  sourceEvidence: EstimateRowSourceEvidence[];
  availabilityStatus: "unknown" | "known_unavailable" | "known_available";
  stockKnown: boolean;
};

export type BuiltInAiProductSearchResult = {
  query: string;
  category: string;
  candidates: BuiltInAiProductCandidate[];
  sourceBacked: boolean;
  fakeStockOrAvailabilityFound: boolean;
};

export type BuiltInAiToolResult = {
  toolName?: BuiltInAiToolName;
  backendCalled: boolean;
  estimate?: GlobalEstimateResult;
  productSearch?: BuiltInAiProductSearchResult;
  requestDraft?: ConsumerRepairDraftBundle;
  fallbackUsed?: string;
  blockedBy?: string;
};

export type BuiltInAiRuntimeTrace = {
  traceId: string;
  input: string;
  screenContext: string;
  detectedIntent: string;
  selectedRoute: string;
  selectedTool?: string;
  workKey?: string;
  category?: string;
  volume?: number;
  unit?: string;
  backendCalled: boolean;
  fallbackUsed?: string;
  blockedBy?: string;
  outputContract: {
    hasTable: boolean;
    hasMaterials: boolean;
    hasLabor: boolean;
    hasSources: boolean;
    hasPdfAction: boolean;
  };
};

export type BuiltInAiAnswer = {
  handled: boolean;
  route: BuiltInAiIntentRoute;
  answerTextRu: string;
  actions: BuiltInAiAction[];
  toolResult: BuiltInAiToolResult;
  runtimeTrace: BuiltInAiRuntimeTrace;
};
