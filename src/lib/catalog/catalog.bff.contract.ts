import type { CatalogSearchRpcArgs, CatalogSearchRpcName } from "./catalog.types";

export type CatalogTransportBffContractId = "catalog_transport_read_scope_v1";
export type CatalogTransportBffDocumentType = "catalog_transport_read_scope";
export type CatalogTransportBffRouteOperation = "catalog.transport.read.scope";

export type CatalogTransportBffOperation =
  | "catalog.supplier_counterparty.list"
  | "catalog.subcontract_counterparty.list"
  | "catalog.contractor_counterparty.list"
  | "catalog.contractor_profile.list"
  | "catalog.search.rpc"
  | "catalog.search.fallback"
  | "catalog.groups.list"
  | "catalog.uoms.list"
  | "catalog.incoming_items.list"
  | "catalog.suppliers.rpc"
  | "catalog.suppliers.table"
  | "catalog.rik_quick_search.fallback";

export type CatalogTransportBffOperationClass =
  | "reference_list_read"
  | "preview_list_read"
  | "read_rpc";

export type CatalogTransportBffPageDefaults = {
  pageSize: number;
  maxPageSize: number;
  maxRows: number;
  maxPages?: number;
};

export type CatalogTransportSearchArgs = {
  searchTerm: string;
};

export type CatalogTransportTokenSearchArgs = {
  searchTerm: string;
  tokens: string[];
  limit: number;
};

export type CatalogTransportContractorProfileArgs = {
  withFilter: boolean;
};

export type CatalogTransportSearchRpcArgs = {
  fn: CatalogSearchRpcName;
  args: CatalogSearchRpcArgs;
};

export type CatalogTransportIncomingItemsArgs = {
  incomingId: string;
};

export type CatalogTransportSuppliersRpcArgs = {
  searchTerm: string | null;
};

export type CatalogTransportBffRequestDto =
  | {
      operation: "catalog.supplier_counterparty.list";
      args: CatalogTransportSearchArgs;
    }
  | {
      operation: "catalog.subcontract_counterparty.list";
      args: Record<string, never>;
    }
  | {
      operation: "catalog.contractor_counterparty.list";
      args: Record<string, never>;
    }
  | {
      operation: "catalog.contractor_profile.list";
      args: CatalogTransportContractorProfileArgs;
    }
  | {
      operation: "catalog.search.rpc";
      args: CatalogTransportSearchRpcArgs;
    }
  | {
      operation: "catalog.search.fallback";
      args: CatalogTransportTokenSearchArgs;
    }
  | {
      operation: "catalog.groups.list";
      args: Record<string, never>;
    }
  | {
      operation: "catalog.uoms.list";
      args: Record<string, never>;
    }
  | {
      operation: "catalog.incoming_items.list";
      args: CatalogTransportIncomingItemsArgs;
    }
  | {
      operation: "catalog.suppliers.rpc";
      args: CatalogTransportSuppliersRpcArgs;
    }
  | {
      operation: "catalog.suppliers.table";
      args: CatalogTransportSearchArgs;
    }
  | {
      operation: "catalog.rik_quick_search.fallback";
      args: CatalogTransportTokenSearchArgs;
    };

export type CatalogTransportBffRow = Record<string, unknown>;

export type CatalogTransportBffReadErrorDto = {
  code: "CATALOG_TRANSPORT_BFF_READ_ERROR";
  message: "Catalog transport read failed";
};

export type CatalogTransportBffReadResultDto = {
  data: CatalogTransportBffRow[] | null;
  error: CatalogTransportBffReadErrorDto | null;
};

export type CatalogTransportBffResponseDto = {
  contractId: CatalogTransportBffContractId;
  documentType: CatalogTransportBffDocumentType;
  operation: CatalogTransportBffOperation;
  result: CatalogTransportBffReadResultDto;
  source: "bff:catalog_transport_read_scope_v1";
};

export type CatalogTransportBffErrorEnvelope = {
  ok: false;
  error: {
    code:
      | "CATALOG_TRANSPORT_BFF_INVALID_OPERATION"
      | "CATALOG_TRANSPORT_BFF_UPSTREAM_ERROR"
      | "CATALOG_TRANSPORT_BFF_INVALID_RESPONSE";
    message: string;
  };
};

export type CatalogTransportBffEnvelope =
  | {
      ok: true;
      data: CatalogTransportBffResponseDto;
    }
  | CatalogTransportBffErrorEnvelope;

export type CatalogTransportBffOperationContract = {
  operation: CatalogTransportBffOperation;
  operationClass: CatalogTransportBffOperationClass;
  responseEnvelope: "CatalogTransportBffEnvelope";
  filterScope: {
    search: boolean;
    tokens: boolean;
    rpcName: boolean;
    apps: boolean;
    incoming: boolean;
    contractorProfileFlag: boolean;
    paginationCeiling: boolean;
  };
  sourceKind:
    | "table:suppliers"
    | "table:subcontracts"
    | "table:contractors"
    | "table:user_profiles"
    | "table:rik_items"
    | "table:catalog_groups_clean"
    | "table:ref_uoms_clean"
    | "table:wh_incoming_items_clean"
    | "rpc:rik_quick_ru|rik_quick_search_typed|rik_quick_search"
    | "rpc:suppliers_list";
  ordering:
    | "name_id_asc"
    | "contractor_org_id_asc"
    | "company_name_id_asc"
    | "user_id_asc"
    | "rik_code_name_human_id_asc"
    | "code_asc"
    | "code_id_asc"
    | "incoming_item_id_asc"
    | "rpc_owned";
  readOnly: true;
  trafficEnabledByDefault: false;
  wiredToAppRuntime: true;
};

export const CATALOG_TRANSPORT_BFF_REFERENCE_PAGE_DEFAULTS = Object.freeze({
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
  maxPages: 51,
} as const satisfies CatalogTransportBffPageDefaults);

export const CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS = Object.freeze({
  pageSize: 50,
  maxPageSize: 100,
  maxRows: 100,
} as const satisfies CatalogTransportBffPageDefaults);

export const CATALOG_TRANSPORT_BFF_CONTRACT = Object.freeze({
  contractId: "catalog_transport_read_scope_v1",
  documentType: "catalog_transport_read_scope",
  routeOperation: "catalog.transport.read.scope",
  endpoint: "POST /api/staging-bff/read/catalog-transport-read-scope",
  source: "bff:catalog_transport_read_scope_v1",
  responseEnvelope: "CatalogTransportBffEnvelope",
  readOnly: true,
  trafficEnabledByDefault: false,
  wiredToAppRuntime: true,
  productionTrafficEnabled: false,
  callsSupabaseDirectlyFromClient: false,
} as const);

export const CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS = Object.freeze([
  {
    operation: "catalog.supplier_counterparty.list",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: true,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:suppliers",
    ordering: "name_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.subcontract_counterparty.list",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: false,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:subcontracts",
    ordering: "contractor_org_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.contractor_counterparty.list",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: false,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:contractors",
    ordering: "company_name_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.contractor_profile.list",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: false,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: true,
      paginationCeiling: true,
    },
    sourceKind: "table:user_profiles",
    ordering: "user_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.search.rpc",
    operationClass: "read_rpc",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: true,
      tokens: false,
      rpcName: true,
      apps: true,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "rpc:rik_quick_ru|rik_quick_search_typed|rik_quick_search",
    ordering: "rpc_owned",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.search.fallback",
    operationClass: "preview_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: true,
      tokens: true,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:rik_items",
    ordering: "rik_code_name_human_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.groups.list",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: false,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:catalog_groups_clean",
    ordering: "code_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.uoms.list",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: false,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:ref_uoms_clean",
    ordering: "code_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.incoming_items.list",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: false,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: true,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:wh_incoming_items_clean",
    ordering: "incoming_item_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.suppliers.rpc",
    operationClass: "read_rpc",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: true,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "rpc:suppliers_list",
    ordering: "rpc_owned",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.suppliers.table",
    operationClass: "reference_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: true,
      tokens: false,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:suppliers",
    ordering: "name_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "catalog.rik_quick_search.fallback",
    operationClass: "preview_list_read",
    responseEnvelope: "CatalogTransportBffEnvelope",
    filterScope: {
      search: true,
      tokens: true,
      rpcName: false,
      apps: false,
      incoming: false,
      contractorProfileFlag: false,
      paginationCeiling: true,
    },
    sourceKind: "table:rik_items",
    ordering: "rik_code_name_human_id_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
] as const satisfies readonly CatalogTransportBffOperationContract[]);

export const CATALOG_TRANSPORT_BFF_DIRECT_FALLBACK_REASON =
  "Catalog transport read traffic is BFF-aware but disabled by default; the existing bounded Supabase read transport is retained as a compatibility fallback until readonly BFF traffic is explicitly enabled.";
