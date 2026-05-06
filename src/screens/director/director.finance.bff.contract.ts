import type {
  DirectorFinanceFetchSummaryV1Args,
  DirectorFinancePanelScopeV1Args,
  DirectorFinancePanelScopeV2Args,
  DirectorFinancePanelScopeV3Args,
  DirectorFinancePanelScopeV4Args,
  DirectorFinanceSummaryV2Args,
  DirectorFinanceSupplierScopeV1Args,
  DirectorFinanceSupplierScopeV2Args,
} from "../../types/contracts/director";

export type DirectorFinanceBffContractId = "director_finance_rpc_scope_v1";
export type DirectorFinanceBffDocumentType = "director_finance_rpc_scope";

export type DirectorFinanceBffOperation =
  | "director.finance.summary.v1"
  | "director.finance.summary.v2"
  | "director.finance.panel_scope.v1"
  | "director.finance.panel_scope.v2"
  | "director.finance.panel_scope.v3"
  | "director.finance.panel_scope.v4"
  | "director.finance.supplier_scope.v1"
  | "director.finance.supplier_scope.v2";

export type DirectorFinanceBffRpcName =
  | "director_finance_fetch_summary_v1"
  | "director_finance_summary_v2"
  | "director_finance_panel_scope_v1"
  | "director_finance_panel_scope_v2"
  | "director_finance_panel_scope_v3"
  | "director_finance_panel_scope_v4"
  | "director_finance_supplier_scope_v1"
  | "director_finance_supplier_scope_v2";

export type DirectorFinanceBffOperationClass =
  | "read_rpc"
  | "aggregation_read_rpc";

export type DirectorFinanceBffRequestDto =
  | {
      operation: "director.finance.summary.v1";
      args: DirectorFinanceFetchSummaryV1Args;
    }
  | {
      operation: "director.finance.summary.v2";
      args: DirectorFinanceSummaryV2Args;
    }
  | {
      operation: "director.finance.panel_scope.v1";
      args: DirectorFinancePanelScopeV1Args;
    }
  | {
      operation: "director.finance.panel_scope.v2";
      args: DirectorFinancePanelScopeV2Args;
    }
  | {
      operation: "director.finance.panel_scope.v3";
      args: DirectorFinancePanelScopeV3Args;
    }
  | {
      operation: "director.finance.panel_scope.v4";
      args: DirectorFinancePanelScopeV4Args;
    }
  | {
      operation: "director.finance.supplier_scope.v1";
      args: DirectorFinanceSupplierScopeV1Args;
    }
  | {
      operation: "director.finance.supplier_scope.v2";
      args: DirectorFinanceSupplierScopeV2Args;
    };

export type DirectorFinanceBffResponseDto = {
  ok: true;
  contractId: DirectorFinanceBffContractId;
  documentType: DirectorFinanceBffDocumentType;
  operation: DirectorFinanceBffOperation;
  rpcName: DirectorFinanceBffRpcName;
  payload: Record<string, unknown>;
  source: "bff:director_finance_rpc_scope_v1";
};

export type DirectorFinanceBffErrorEnvelope = {
  ok: false;
  error: {
    code:
      | "DIRECTOR_FINANCE_BFF_CONTRACT_ONLY"
      | "DIRECTOR_FINANCE_BFF_INVALID_OPERATION"
      | "DIRECTOR_FINANCE_BFF_UPSTREAM_ERROR"
      | "DIRECTOR_FINANCE_BFF_INVALID_RESPONSE";
    message: string;
  };
};

export type DirectorFinanceBffEnvelope =
  | DirectorFinanceBffResponseDto
  | DirectorFinanceBffErrorEnvelope;

export type DirectorFinanceBffOperationContract = {
  operation: DirectorFinanceBffOperation;
  rpcName: DirectorFinanceBffRpcName;
  operationClass: DirectorFinanceBffOperationClass;
  requestDto: DirectorFinanceBffRequestDto["operation"];
  responseEnvelope: "DirectorFinanceBffEnvelope";
  validator:
    | "isDirectorFinanceSummaryRpcResponse"
    | "isDirectorFinanceSummaryV2RpcResponse"
    | "isDirectorFinancePanelScopeRpcResponse"
    | "isDirectorFinancePanelScopeV2RpcResponse"
    | "isDirectorFinancePanelScopeV3RpcResponse"
    | "isDirectorFinancePanelScopeV4RpcResponse"
    | "isDirectorFinanceSupplierScopeRpcResponse";
  filterScope: {
    period: boolean;
    object: boolean;
    supplier: boolean;
    kindName: boolean;
    pagination: boolean;
  };
  ordering: "rpc_owned" | "pagination_offset_owned";
  aggregationSemantics: "rpc_owned_summary" | "rpc_owned_panel_scope" | "rpc_owned_supplier_scope";
  readOnly: true;
  trafficEnabledByDefault: false;
  wiredToAppRuntime: false;
};

export const DIRECTOR_FINANCE_BFF_CONTRACT = Object.freeze({
  contractId: "director_finance_rpc_scope_v1",
  documentType: "director_finance_rpc_scope",
  endpoint: "POST /api/staging-bff/read/director-finance-rpc-scope",
  source: "bff:director_finance_rpc_scope_v1",
  responseEnvelope: "DirectorFinanceBffEnvelope",
  readOnly: true,
  trafficEnabledByDefault: false,
  wiredToAppRuntime: false,
  productionTrafficEnabled: false,
  callsSupabaseDirectlyFromClient: false,
} as const);

export const DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS = Object.freeze([
  {
    operation: "director.finance.summary.v1",
    rpcName: "director_finance_fetch_summary_v1",
    operationClass: "aggregation_read_rpc",
    requestDto: "director.finance.summary.v1",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinanceSummaryRpcResponse",
    filterScope: { period: true, object: false, supplier: false, kindName: false, pagination: false },
    ordering: "rpc_owned",
    aggregationSemantics: "rpc_owned_summary",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
  {
    operation: "director.finance.summary.v2",
    rpcName: "director_finance_summary_v2",
    operationClass: "aggregation_read_rpc",
    requestDto: "director.finance.summary.v2",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinanceSummaryV2RpcResponse",
    filterScope: { period: true, object: true, supplier: false, kindName: false, pagination: false },
    ordering: "rpc_owned",
    aggregationSemantics: "rpc_owned_summary",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
  {
    operation: "director.finance.panel_scope.v1",
    rpcName: "director_finance_panel_scope_v1",
    operationClass: "aggregation_read_rpc",
    requestDto: "director.finance.panel_scope.v1",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinancePanelScopeRpcResponse",
    filterScope: { period: true, object: false, supplier: false, kindName: false, pagination: false },
    ordering: "rpc_owned",
    aggregationSemantics: "rpc_owned_panel_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
  {
    operation: "director.finance.panel_scope.v2",
    rpcName: "director_finance_panel_scope_v2",
    operationClass: "aggregation_read_rpc",
    requestDto: "director.finance.panel_scope.v2",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinancePanelScopeV2RpcResponse",
    filterScope: { period: true, object: true, supplier: false, kindName: false, pagination: true },
    ordering: "pagination_offset_owned",
    aggregationSemantics: "rpc_owned_panel_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
  {
    operation: "director.finance.panel_scope.v3",
    rpcName: "director_finance_panel_scope_v3",
    operationClass: "aggregation_read_rpc",
    requestDto: "director.finance.panel_scope.v3",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinancePanelScopeV3RpcResponse",
    filterScope: { period: true, object: true, supplier: false, kindName: false, pagination: true },
    ordering: "pagination_offset_owned",
    aggregationSemantics: "rpc_owned_panel_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
  {
    operation: "director.finance.panel_scope.v4",
    rpcName: "director_finance_panel_scope_v4",
    operationClass: "aggregation_read_rpc",
    requestDto: "director.finance.panel_scope.v4",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinancePanelScopeV4RpcResponse",
    filterScope: { period: true, object: true, supplier: false, kindName: false, pagination: true },
    ordering: "pagination_offset_owned",
    aggregationSemantics: "rpc_owned_panel_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
  {
    operation: "director.finance.supplier_scope.v1",
    rpcName: "director_finance_supplier_scope_v1",
    operationClass: "read_rpc",
    requestDto: "director.finance.supplier_scope.v1",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinanceSupplierScopeRpcResponse",
    filterScope: { period: true, object: false, supplier: true, kindName: true, pagination: false },
    ordering: "rpc_owned",
    aggregationSemantics: "rpc_owned_supplier_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
  {
    operation: "director.finance.supplier_scope.v2",
    rpcName: "director_finance_supplier_scope_v2",
    operationClass: "read_rpc",
    requestDto: "director.finance.supplier_scope.v2",
    responseEnvelope: "DirectorFinanceBffEnvelope",
    validator: "isDirectorFinanceSupplierScopeRpcResponse",
    filterScope: { period: true, object: true, supplier: true, kindName: true, pagination: false },
    ordering: "rpc_owned",
    aggregationSemantics: "rpc_owned_supplier_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: false,
  },
] as const satisfies readonly DirectorFinanceBffOperationContract[]);

export const DIRECTOR_FINANCE_BFF_REMAINING_DIRECT_BYPASS_REASON =
  "Director finance RPC traffic remains on the existing validated Supabase RPC path until a dedicated BFF handler proves equivalent aggregation/report semantics and production traffic is explicitly enabled.";
