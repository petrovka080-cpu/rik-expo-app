export type AssistantStoreReadBffContractId = "assistant_store_read_scope_v1";
export type AssistantStoreReadBffDocumentType = "assistant_store_read_scope";
export type AssistantStoreReadBffRouteOperation = "assistant.store.read.scope";

export type AssistantStoreReadBffOperation =
  | "assistant.actor.context"
  | "assistant.market.active_listings"
  | "assistant.market.companies_by_ids"
  | "assistant.market.profiles_by_user_ids"
  | "profile.current.full_name"
  | "chat.actor.context"
  | "chat.listing.messages.list"
  | "chat.profiles_by_user_ids"
  | "supplier_showcase.profile_by_user_id"
  | "supplier_showcase.company_by_id"
  | "supplier_showcase.company_by_owner_user_id"
  | "supplier_showcase.listings_by_user_id"
  | "supplier_showcase.listings_by_company_id"
  | "request.submitted_at.capability"
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

export type AssistantUserReadArgs = {
  userId: string;
};

export type AssistantCompanyReadArgs = {
  companyId: string;
};

export type AssistantListingReadArgs = {
  listingId: string;
  pageSize?: number | null;
};

export type SupplierShowcaseListingsReadArgs =
  | {
      userId: string;
      includeInactive?: boolean | null;
      pageSize?: number | null;
    }
  | {
      companyId: string;
      includeInactive?: boolean | null;
      pageSize?: number | null;
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
      operation: "profile.current.full_name";
      args: AssistantUserReadArgs;
    }
  | {
      operation: "chat.actor.context";
      args: AssistantUserReadArgs;
    }
  | {
      operation: "chat.listing.messages.list";
      args: AssistantListingReadArgs;
    }
  | {
      operation: "chat.profiles_by_user_ids";
      args: AssistantIdsReadArgs;
    }
  | {
      operation: "supplier_showcase.profile_by_user_id";
      args: AssistantUserReadArgs;
    }
  | {
      operation: "supplier_showcase.company_by_id";
      args: AssistantCompanyReadArgs;
    }
  | {
      operation: "supplier_showcase.company_by_owner_user_id";
      args: AssistantUserReadArgs;
    }
  | {
      operation: "supplier_showcase.listings_by_user_id";
      args: Extract<SupplierShowcaseListingsReadArgs, { userId: string }>;
    }
  | {
      operation: "supplier_showcase.listings_by_company_id";
      args: Extract<SupplierShowcaseListingsReadArgs, { companyId: string }>;
    }
  | {
      operation: "request.submitted_at.capability";
      args: Record<string, never>;
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
  operationClass:
    | "assistant_read"
    | "profile_read"
    | "chat_read"
    | "supplier_showcase_read"
    | "request_schema_probe"
    | "store_list_read";
  responseEnvelope: "AssistantStoreReadBffEnvelope";
  filterScope: {
    user: boolean;
    ids: boolean;
    request: boolean;
    status: boolean;
    paginationCeiling: boolean;
    company?: boolean;
    listing?: boolean;
    includeInactive?: boolean;
    schemaProbe?: boolean;
  };
  sourceKind:
    | "tables:user_profiles+company_members+companies+market_listings"
    | "tables:user_profiles+companies+market_listings"
    | "tables:chat_messages+user_profiles"
    | "table:market_listings"
    | "table:companies"
    | "table:user_profiles"
    | "table:chat_messages"
    | "table:requests"
    | "table:request_items"
    | "view:request_items_pending_view"
    | "view:v_request_items_display";
  ordering:
    | "created_at_id_desc"
    | "created_at_id_asc"
    | "created_at_desc"
    | "created_at_request_item_id_desc_asc"
    | "id_asc"
    | "input_ids"
    | "user_id_asc"
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

export const ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS = Object.freeze({
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 100,
} as const);

export const ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS = Object.freeze({
  pageSize: 60,
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
    operation: "profile.current.full_name",
    operationClass: "profile_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: true, ids: false, request: false, status: false, paginationCeiling: false },
    sourceKind: "table:user_profiles",
    ordering: "single_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "chat.actor.context",
    operationClass: "chat_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: true, ids: false, request: false, status: false, paginationCeiling: false },
    sourceKind: "tables:user_profiles+companies+market_listings",
    ordering: "single_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "chat.listing.messages.list",
    operationClass: "chat_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: false, request: false, status: true, paginationCeiling: true, listing: true },
    sourceKind: "table:chat_messages",
    ordering: "created_at_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "chat.profiles_by_user_ids",
    operationClass: "chat_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: true, request: false, status: false, paginationCeiling: true },
    sourceKind: "table:user_profiles",
    ordering: "user_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "supplier_showcase.profile_by_user_id",
    operationClass: "supplier_showcase_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: true, ids: false, request: false, status: false, paginationCeiling: false },
    sourceKind: "table:user_profiles",
    ordering: "single_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "supplier_showcase.company_by_id",
    operationClass: "supplier_showcase_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: false, request: false, status: false, paginationCeiling: false, company: true },
    sourceKind: "table:companies",
    ordering: "single_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "supplier_showcase.company_by_owner_user_id",
    operationClass: "supplier_showcase_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: true, ids: false, request: false, status: false, paginationCeiling: false, company: true },
    sourceKind: "table:companies",
    ordering: "created_at_desc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "supplier_showcase.listings_by_user_id",
    operationClass: "supplier_showcase_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: {
      user: true,
      ids: false,
      request: false,
      status: true,
      paginationCeiling: true,
      includeInactive: true,
    },
    sourceKind: "table:market_listings",
    ordering: "created_at_id_desc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "supplier_showcase.listings_by_company_id",
    operationClass: "supplier_showcase_read",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: {
      user: false,
      ids: false,
      request: false,
      status: true,
      paginationCeiling: true,
      company: true,
      includeInactive: true,
    },
    sourceKind: "table:market_listings",
    ordering: "created_at_id_desc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "request.submitted_at.capability",
    operationClass: "request_schema_probe",
    responseEnvelope: "AssistantStoreReadBffEnvelope",
    filterScope: { user: false, ids: false, request: false, status: false, paginationCeiling: false, schemaProbe: true },
    sourceKind: "table:requests",
    ordering: "single_scope",
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
