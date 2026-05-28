import type {
  DirectorDisciplinePayload,
  DirectorReportOptions,
  DirectorReportPayload,
} from "./director_reports.shared";

export type DirectorReportsAggregationContractId = "director_report_transport_scope_v1";
export type DirectorReportsAggregationContractVersion = "v1";
export type DirectorReportsAggregationDocumentType = "director_report_transport_scope";
export type DirectorReportsFactContractId = "director_fact_context_contract_v1";

export type DirectorReportsFactContextField =
  | "object_id_resolved"
  | "object_name_resolved"
  | "work_name_resolved"
  | "level_name_resolved"
  | "system_name_resolved"
  | "zone_name_resolved"
  | "is_without_request";

export type DirectorReportsFactContract = {
  contractId: DirectorReportsFactContractId;
  owner: "director_report_transport_scope_v1";
  version: DirectorReportsAggregationContractVersion;
  requiredResolvedFields: readonly DirectorReportsFactContextField[];
  sourcePriority: {
    objectIdentity: readonly string[];
    workIdentity: readonly string[];
    locationIdentity: readonly string[];
  };
  forbiddenClientResponsibilities: readonly string[];
};

export type DirectorReportsAggregationRequestDto = {
  contractId: DirectorReportsAggregationContractId;
  version: DirectorReportsAggregationContractVersion;
  filters: {
    period: {
      from?: string;
      to?: string;
    };
    objectName?: string;
    companyId?: string;
    userId?: string;
  };
  include: {
    options: true;
    materials: true;
    discipline: boolean;
    costs: boolean;
  };
};

export type DirectorReportsAggregationRpcParamsV1 = {
  p_from?: string;
  p_to?: string;
  p_object_name?: string;
  p_include_discipline: boolean;
  p_include_costs: boolean;
};

export type DirectorReportsAggregationRpcEnvelopeV1 = {
  document_type: DirectorReportsAggregationDocumentType;
  version: DirectorReportsAggregationContractVersion;
  options_payload: unknown;
  report_payload: unknown;
  discipline_payload?: unknown | null;
  canonical_summary?: unknown;
  canonical_diagnostics?: unknown;
  priced_stage?: "base" | "priced" | null;
};

export const DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT = {
  contractId: "director_fact_context_contract_v1",
  owner: "director_report_transport_scope_v1",
  version: "v1",
  requiredResolvedFields: [
    "object_id_resolved",
    "object_name_resolved",
    "work_name_resolved",
    "level_name_resolved",
    "system_name_resolved",
    "zone_name_resolved",
    "is_without_request",
  ],
  sourcePriority: {
    objectIdentity: [
      "request.object_identity_key",
      "request.object_identity_name",
      "request.object_id",
      "request.object_name",
      "warehouse_issue.target_object_id",
      "warehouse_issue.object_name",
      "free_issue_note.object_name_when_no_request_only",
    ],
    workIdentity: [
      "warehouse_issue.work_name",
      "free_issue_note.work_name",
      "request.system_code",
      "request.zone_code",
      "request_item.item_kind",
    ],
    locationIdentity: [
      "request.level_code",
      "free_issue_note.level_name",
      "request.zone_code",
      "free_issue_note.zone_name",
      "request.system_code",
      "free_issue_note.system_name",
    ],
  },
  forbiddenClientResponsibilities: [
    "client_full_table_fact_aggregation",
    "client_report_kpi_recompute",
    "client_purchase_cost_object_matching",
    "client_warehouse_issue_note_as_primary_schema",
    "ui_screen_local_report_calculation",
  ],
} as const satisfies DirectorReportsFactContract;

export type DirectorReportsAggregationResponseDto = {
  document_type: DirectorReportsAggregationDocumentType;
  version: DirectorReportsAggregationContractVersion;
  options: DirectorReportOptions;
  report: DirectorReportPayload;
  discipline: DirectorDisciplinePayload | null;
  canonicalSummary: unknown;
  canonicalDiagnostics: unknown;
  pricedStage: "base" | "priced" | null;
};

export type DirectorReportsAggregationErrorCode =
  | "DIRECTOR_REPORTS_AGGREGATION_RPC_UNAVAILABLE"
  | "DIRECTOR_REPORTS_AGGREGATION_INVALID_ENVELOPE"
  | "DIRECTOR_REPORTS_AGGREGATION_INVALID_PAYLOAD"
  | "DIRECTOR_REPORTS_AGGREGATION_REQUIRED";

export type DirectorReportsAggregationErrorEnvelope = {
  ok: false;
  error: {
    code: DirectorReportsAggregationErrorCode;
    message: string;
  };
};

export type DirectorReportsAggregationSuccessEnvelope = {
  ok: true;
  data: DirectorReportsAggregationResponseDto;
};

export type DirectorReportsAggregationEnvelope =
  | DirectorReportsAggregationSuccessEnvelope
  | DirectorReportsAggregationErrorEnvelope;

export const DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT = {
  contractId: "director_report_transport_scope_v1",
  version: "v1",
  rpcName: "director_report_transport_scope_v1",
  documentType: "director_report_transport_scope",
  method: "POST",
  endpoint: "POST /bff/director/reports/aggregation",
  sourceKind: "transport:director_report_scope_rpc_v1",
  responseEnvelope: "DirectorReportsAggregationEnvelope",
  filters: ["period.from", "period.to", "objectName", "companyId", "userId"],
  scopes: ["period", "company", "user", "object"],
  deterministicOrdering: {
    options: "objects sorted by backend sort_ord then object name",
    materials: "qty_total desc, material identity tie-breakers in backend contract",
    works: "total_qty desc, total_positions desc, work/location/material names asc",
  },
  aggregationSemantics: {
    materials: "server-side grouped issued-material totals with KPI totals; no client full-table aggregation",
    discipline: "server-side work/location/material aggregation with optional cost enrichment",
    options: "server-side object option projection for the requested period",
  },
  factContextContract: DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT,
  listOutput: "full_aggregate_rows_not_preview",
  noSilentTruncation: true,
  fullReportTotalsServerSide: true,
  errorEnvelope: "generic code/message only; raw payloads and DB rows are not returned",
} as const;

const cleanOptionalText = (value: string | null | undefined): string | undefined => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

export function buildDirectorReportsAggregationRequest(args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
  companyId?: string | null;
  userId?: string | null;
}): DirectorReportsAggregationRequestDto {
  return {
    contractId: DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.contractId,
    version: DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.version,
    filters: {
      period: {
        from: cleanOptionalText(args.from),
        to: cleanOptionalText(args.to),
      },
      objectName: cleanOptionalText(args.objectName),
      companyId: cleanOptionalText(args.companyId),
      userId: cleanOptionalText(args.userId),
    },
    include: {
      options: true,
      materials: true,
      discipline: args.includeDiscipline,
      costs: args.includeDiscipline ? !args.skipDisciplinePrices : false,
    },
  };
}

export function toDirectorReportsAggregationRpcParams(
  request: DirectorReportsAggregationRequestDto,
): DirectorReportsAggregationRpcParamsV1 {
  return {
    p_from: request.filters.period.from,
    p_to: request.filters.period.to,
    p_object_name: request.filters.objectName,
    p_include_discipline: request.include.discipline,
    p_include_costs: request.include.costs,
  };
}

export function buildDirectorReportsAggregationErrorEnvelope(
  code: DirectorReportsAggregationErrorCode,
  _message = "Director reports aggregation failed.",
): DirectorReportsAggregationErrorEnvelope {
  return {
    ok: false,
    error: {
      code,
      message: "Director reports aggregation failed.",
    },
  };
}

export class DirectorReportsAggregationContractRequiredError extends Error {
  constructor(path: string) {
    super(`${path} requires ${DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.rpcName}`);
    this.name = "DirectorReportsAggregationContractRequiredError";
  }
}

export function createDirectorReportsAggregationContractRequiredError(path: string) {
  return new DirectorReportsAggregationContractRequiredError(path);
}
