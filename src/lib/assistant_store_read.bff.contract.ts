export type AssistantStoreReadBffContractId = "assistant_store_read_scope_v1";
export type AssistantStoreReadBffDocumentType = "assistant_store_read_scope";
export type AssistantStoreReadBffRouteOperation = "assistant.store.read.scope";

export type AssistantStoreReadBffOperation =
  | "assistant.actor.context"
  | "assistant.market.active_listings"
  | "assistant.market.companies_by_ids"
  | "assistant.market.profiles_by_user_ids"
  | "store.request_items.list"
  | "store.director_inbox.list"
  | "store.approved_request_items.list";

export type AssistantActorContextReadArgs = {
  userId: string;
};

export type AssistantMarketActiveListingsReadArgs = {
  pageSize?: number | null;
};

export type AssistantIdsReadArgs = {
  ids: string[];
};

export type StoreRequestItemsReadArgs = {
  requestId: string;
  status?: string | null;
};

export type StoreApprovedRequestItemsReadArgs = {
  requestId: string;
};

export type AssistantStoreReadBffRequestDto =
  | {
      operation: "assistant.actor.context";
      args: AssistantActorContextReadArgs;
    }
  | {
      operation: "assistant.market.active_listings";
      args: AssistantMarketActiveListingsReadArgs;
    }
  | {
      operation: "assistant.market.companies_by_ids";
      args: AssistantIdsReadArgs;
    }
  | {
      operation: "assistant.market.profiles_by_user_ids";
      args: AssistantIdsReadArgs;
    }
  | {
      operation: "store.request_items.list";
      args: StoreRequestItemsReadArgs;
    }
  | {
      operation: "store.director_inbox.list";
      args: Record<string, never>;
    }
  | {
      operation: "store.approved_request_items.list";
      args: StoreApprovedRequestItemsReadArgs;
    };

export type AssistantStoreReadBffRow = Record<string, unknown>;

export type AssistantStoreReadBffReadErrorDto = {
  code: "ASSISTANT_STORE_READ_BFF_ERROR";
  message: "Assistant/store read failed";
};

export type AssistantStoreReadBffReadResultDto = {
  data: AssistantStoreReadBffRow[] | null;
  error: AssistantStoreReadBffReadErrorDto | null;
};

export type AssistantStoreReadBffResponseDto = {
  contractId: AssistantStoreReadBffContractId;
  documentType: AssistantStoreReadBffDocumentType;
  operation: AssistantStoreReadBffOperation;
  result: AssistantStoreReadBffReadResultDto;
  source: "bff:assistant_store_read_scope_v1";
};

export type AssistantStoreReadBffErrorEnvelope = {
  ok: false;
  error: {
    code:
      | "ASSISTANT_STORE_READ_BFF_INVALID_OPERATION"
      | "ASSISTANT_STORE_READ_BFF_UPSTREAM_ERROR"
      | "ASSISTANT_STORE_READ_BFF_INVALID_RESPONSE";
    message: string;
  };
};

export type AssistantStoreReadBffEnvelope =
  | {
      ok: true;
      data: AssistantStoreReadBffResponseDto;
    }
  | AssistantStoreReadBffErrorEnvelope;

export type AssistantStoreReadBffOperationContract = {
  operation: AssistantStoreReadBffOperation;
  operationClass: "assistant_read" | "store_list_read";
  responseEnvelope: "AssistantStoreReadBffEnvelope";
  filterScope: {
    user: boolean;
    ids: boolean;
    request: boolean;
    status: boolean;
    paginationCeiling: boolean;
  };
  sourceKind:
    | "tables:user_profiles+company_members+companies+market_listings"
    | "table:market_listings"
    | "table:companies"
    | "table:user_profiles"
    | "table:request_items"
    | "view:request_items_pending_view"
    | "view:v_request_items_display";
  ordering:
    | "created_at_id_desc"
    | "created_at_id_asc"
    | "created_at_request_item_id_desc_asc"
    | "id_asc"
    | "input_ids"
    | "single_scope";
  readOnly: true;
  trafficEnabledByDefault: false;
  wiredToAppRuntime: true;
};

export const ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS = Object.freeze({
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
  maxPages: 51,
} as const);

export const ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS = Object.freeze({
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 100,
} as const);

export const ASSISTANT_STORE_READ_BFF_CONTRACT = Object.freeze({
  contractId: "assistant_store_read_scope_v1",
  documentType: "assistant_store_read_scope",
  routeOperation: "assistant.store.read.scope",
  endpoint: "POST /api/staging-bff/read/assistant-store-read-scope",
  source: "bff:assistant_store_read_scope_v1",
  responseEnvelope: "AssistantStoreReadBffEnvelope",
  readOnly: true,
  trafficEnabledByDefault: false,
  wiredToAppRuntime: true,
  productionTrafficEnabled: false,
  callsSupabaseDirectlyFromClient: false,
} as const);

export const ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS = Object.freeze([
  {
    operation: "assistant.actor.context",
    operationClass: "assistant_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: true, ids: false, request: false, status: false, paginationCeiling: false },
    sourceKind: "tables:user_profiles+company_members+companies+market_listings",
    ordering: "single_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "assistant.market.active_listings",
    operationClass: "assistant_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: false, request: false, status: true, paginationCeiling: true },
    sourceKind: "table:market_listings",
    ordering: "created_at_id_desc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "assistant.market.companies_by_ids",
    operationClass: "assistant_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: true, request: false, status: false, paginationCeiling: true },
    sourceKind: "table:companies",
    ordering: "input_ids",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "assistant.market.profiles_by_user_ids",
    operationClass: "assistant_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: true, request: false, status: false, paginationCeiling: true },
    sourceKind: "table:user_profiles",
    ordering: "input_ids",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "store.request_items.list",
    operationClass: "store_list_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: false, request: true, status: true, paginationCeiling: true },
    sourceKind: "table:request_items",
    ordering: "created_at_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "store.director_inbox.list",
    operationClass: "store_list_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: false, request: false, status: false, paginationCeiling: true },
    sourceKind: "view:request_items_pending_view",
    ordering: "created_at_request_item_id_desc_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "store.approved_request_items.list",
    operationClass: "store_list_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: false, request: true, status: false, paginationCeiling: true },
    sourceKind: "view:v_request_items_display",
    ordering: "id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
] as const satisfies readonly AssistantStoreReadBffOperationContract[]);

export const ASSISTANT_STORE_READ_BFF_DIRECT_FALLBACK_REASON =
  "Assistant/store safe read traffic is BFF-aware but disabled by default; bounded Supabase read transports are retained as compatibility fallback while auth/session and mutation paths remain outside this read-only wave.";
