export type WarehouseApiBffContractId = "warehouse_api_read_scope_v1";
export type WarehouseApiBffDocumentType = "warehouse_api_read_scope";
export type WarehouseApiBffRouteOperation = "warehouse.api.read.scope";

export type WarehouseApiBffOperation =
  | "warehouse.api.reports.bundle"
  | "warehouse.api.report.issue_lines"
  | "warehouse.api.report.issued_materials_fast"
  | "warehouse.api.report.issued_by_object_fast"
  | "warehouse.api.report.incoming_v2"
  | "warehouse.api.ledger.incoming"
  | "warehouse.api.ledger.incoming_lines"
  | "warehouse.api.uom.material_unit"
  | "warehouse.api.uom.code";

export type WarehouseApiBffOperationClass =
  | "report_read_rpc"
  | "ledger_list_read"
  | "uom_single_read";

export type WarehouseApiBffPeriodArgs = {
  p_from?: string | null;
  p_to?: string | null;
};

export type WarehouseApiBffObjectReportArgs = WarehouseApiBffPeriodArgs & {
  p_object_id?: string | null;
};

export type WarehouseApiBffIssueLinesArgs = {
  p_issue_id: number;
};

export type WarehouseApiBffIncomingLinesArgs = {
  incomingId: string;
};

export type WarehouseApiBffMaterialUnitArgs = {
  matCode: string;
};

export type WarehouseApiBffUomCodeArgs = {
  unitId: string;
};

export type WarehouseApiBffPageInput = {
  page?: number | null;
  pageSize?: number | null;
};

export type WarehouseApiBffRequestDto =
  | {
      operation: "warehouse.api.reports.bundle";
      args: WarehouseApiBffPeriodArgs;
    }
  | {
      operation: "warehouse.api.report.issue_lines";
      args: WarehouseApiBffIssueLinesArgs;
    }
  | {
      operation: "warehouse.api.report.issued_materials_fast";
      args: WarehouseApiBffObjectReportArgs;
    }
  | {
      operation: "warehouse.api.report.issued_by_object_fast";
      args: WarehouseApiBffObjectReportArgs;
    }
  | {
      operation: "warehouse.api.report.incoming_v2";
      args: WarehouseApiBffPeriodArgs;
    }
  | {
      operation: "warehouse.api.ledger.incoming";
      args: WarehouseApiBffPeriodArgs;
      page?: WarehouseApiBffPageInput;
    }
  | {
      operation: "warehouse.api.ledger.incoming_lines";
      args: WarehouseApiBffIncomingLinesArgs;
      page?: WarehouseApiBffPageInput;
    }
  | {
      operation: "warehouse.api.uom.material_unit";
      args: WarehouseApiBffMaterialUnitArgs;
    }
  | {
      operation: "warehouse.api.uom.code";
      args: WarehouseApiBffUomCodeArgs;
    };

export type WarehouseApiBffRow = Record<string, unknown>;

export type WarehouseApiBffReadErrorDto = {
  code: "WAREHOUSE_API_BFF_READ_ERROR";
  message: "Warehouse API read failed";
};

export type WarehouseApiBffReadResultDto = {
  data: WarehouseApiBffRow[] | null;
  error: WarehouseApiBffReadErrorDto | null;
};

export type WarehouseApiBffReportsBundleDto = {
  stock: WarehouseApiBffReadResultDto;
  movement: WarehouseApiBffReadResultDto;
  issues: WarehouseApiBffReadResultDto;
};

export type WarehouseApiBffPayloadDto =
  | {
      kind: "single";
      result: WarehouseApiBffReadResultDto;
    }
  | {
      kind: "reports_bundle";
      result: WarehouseApiBffReportsBundleDto;
    };

export type WarehouseApiBffResponseDto = {
  contractId: WarehouseApiBffContractId;
  documentType: WarehouseApiBffDocumentType;
  operation: WarehouseApiBffOperation;
  payload: WarehouseApiBffPayloadDto;
  source: "bff:warehouse_api_read_scope_v1";
};

export type WarehouseApiBffErrorEnvelope = {
  ok: false;
  error: {
    code:
      | "WAREHOUSE_API_BFF_INVALID_OPERATION"
      | "WAREHOUSE_API_BFF_UPSTREAM_ERROR"
      | "WAREHOUSE_API_BFF_INVALID_RESPONSE";
    message: string;
  };
};

export type WarehouseApiBffEnvelope =
  | {
      ok: true;
      data: WarehouseApiBffResponseDto;
    }
  | WarehouseApiBffErrorEnvelope;

export type WarehouseApiBffOperationContract = {
  operation: WarehouseApiBffOperation;
  operationClass: WarehouseApiBffOperationClass;
  responseEnvelope: "WarehouseApiBffEnvelope";
  filterScope: {
    period: boolean;
    object: boolean;
    issue: boolean;
    incoming: boolean;
    pagination: boolean;
    material?: boolean;
    unit?: boolean;
  };
  sourceKind:
    | "rpc:acc_report_stock+acc_report_movement+acc_report_issues_v2"
    | "rpc:acc_report_issue_lines"
    | "rpc:wh_report_issued_materials_fast"
    | "rpc:wh_report_issued_by_object_fast"
    | "rpc:acc_report_incoming_v2"
    | "table:wh_ledger"
    | "table:rik_materials"
    | "table:rik_uoms";
  ordering: "rpc_owned" | "moved_at_code_asc" | "code_asc" | "single_scope";
  readOnly: true;
  trafficEnabledByDefault: false;
  wiredToAppRuntime: true;
};

export const WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS = Object.freeze({
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
  maxPages: 51,
} as const);

export const WAREHOUSE_API_BFF_CONTRACT = Object.freeze({
  contractId: "warehouse_api_read_scope_v1",
  documentType: "warehouse_api_read_scope",
  routeOperation: "warehouse.api.read.scope",
  endpoint: "POST /api/staging-bff/read/warehouse-api-read-scope",
  source: "bff:warehouse_api_read_scope_v1",
  responseEnvelope: "WarehouseApiBffEnvelope",
  readOnly: true,
  trafficEnabledByDefault: false,
  wiredToAppRuntime: true,
  productionTrafficEnabled: false,
  callsSupabaseDirectlyFromClient: false,
} as const);

export const WAREHOUSE_API_BFF_OPERATION_CONTRACTS = Object.freeze([
  {
    operation: "warehouse.api.reports.bundle",
    operationClass: "report_read_rpc",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: true, object: false, issue: false, incoming: false, pagination: false },
    sourceKind: "rpc:acc_report_stock+acc_report_movement+acc_report_issues_v2",
    ordering: "rpc_owned",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.report.issue_lines",
    operationClass: "report_read_rpc",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: false, object: false, issue: true, incoming: false, pagination: false },
    sourceKind: "rpc:acc_report_issue_lines",
    ordering: "rpc_owned",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.report.issued_materials_fast",
    operationClass: "report_read_rpc",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: true, object: true, issue: false, incoming: false, pagination: false },
    sourceKind: "rpc:wh_report_issued_materials_fast",
    ordering: "rpc_owned",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.report.issued_by_object_fast",
    operationClass: "report_read_rpc",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: true, object: true, issue: false, incoming: false, pagination: false },
    sourceKind: "rpc:wh_report_issued_by_object_fast",
    ordering: "rpc_owned",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.report.incoming_v2",
    operationClass: "report_read_rpc",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: true, object: false, issue: false, incoming: false, pagination: false },
    sourceKind: "rpc:acc_report_incoming_v2",
    ordering: "rpc_owned",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.ledger.incoming",
    operationClass: "ledger_list_read",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: true, object: false, issue: false, incoming: false, pagination: true },
    sourceKind: "table:wh_ledger",
    ordering: "moved_at_code_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.ledger.incoming_lines",
    operationClass: "ledger_list_read",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: false, object: false, issue: false, incoming: true, pagination: true },
    sourceKind: "table:wh_ledger",
    ordering: "code_asc",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.uom.material_unit",
    operationClass: "uom_single_read",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: false, object: false, issue: false, incoming: false, pagination: false, material: true },
    sourceKind: "table:rik_materials",
    ordering: "single_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
  {
    operation: "warehouse.api.uom.code",
    operationClass: "uom_single_read",
    responseEnvelope: "WarehouseApiBffEnvelope",
    filterScope: { period: false, object: false, issue: false, incoming: false, pagination: false, unit: true },
    sourceKind: "table:rik_uoms",
    ordering: "single_scope",
    readOnly: true,
    trafficEnabledByDefault: false,
    wiredToAppRuntime: true,
  },
] as const satisfies readonly WarehouseApiBffOperationContract[]);

export const WAREHOUSE_API_BFF_DIRECT_FALLBACK_REASON =
  "Warehouse API read traffic is BFF-aware but disabled by default; the existing validated Supabase read transport is retained as a compatibility fallback until readonly BFF traffic is explicitly enabled.";
