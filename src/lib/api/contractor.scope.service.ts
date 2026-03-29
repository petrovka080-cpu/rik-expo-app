import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../observability/platformObservability";
import { normalizeRuText } from "../text/encoding";

export type ContractorPublicationState =
  | "ready"
  | "invalid_missing_contractor"
  | "invalid_missing_work_snapshot"
  | "invalid_missing_object_snapshot"
  | "invalid_material_only";

export type ContractorSourceKind =
  | "buyer_subcontract"
  | "foreman_subcontract_request"
  | "foreman_material_request";

export type ContractorWorkNameSource = "snapshot" | "resolver" | "raw_code";
export type ContractorCanonicalCurrentWorkState =
  | "ready_current"
  | "ready_current_degraded_title"
  | "legacy_filtered_out"
  | "historical_excluded";
export type ContractorContractorNameSource =
  | "subcontract_snapshot"
  | "request_snapshot"
  | "canonical_view";
export type ContractorObjectNameSource =
  | "request_snapshot"
  | "subcontract_snapshot"
  | "canonical_view"
  | "resolver"
  | "raw_code";
export type ContractorCanonicalEligibility = {
  isApprovedWork: boolean;
  isCurrentVisibleWork: boolean;
  isLegacyHistoricalRow: boolean;
  hasHumanTitle: boolean;
  hasCurrentObjectContext: boolean;
};

export type ContractorIdentitySnapshot = {
  contractorId: string;
  contractorName: string;
  contractorInn: string | null;
  contractNumber: string | null;
  contractDate: string | null;
};

export type ContractorOriginSnapshot = {
  sourceKind: ContractorSourceKind;
  sourceRequestId: string | null;
  sourceProposalId: string | null;
  sourceSubcontractId: string | null;
  directorApprovedAt: string;
};

export type ContractorWorkSnapshot = {
  workItemId: string;
  workName: string;
  workNameSource: ContractorWorkNameSource;
  quantity: number | null;
  uom: string | null;
  unitPrice: number | null;
  totalAmount: number | null;
  isMaterial: boolean;
};

export type ContractorLocationSnapshot = {
  objectId: string | null;
  objectName: string;
  systemName: string | null;
  zoneName: string | null;
  floorName: string | null;
  locationDisplay: string;
};

export type ContractorInboxRow = {
  workItemId: string;
  progressId: string | null;
  publicationState: "ready";
  identity: ContractorIdentitySnapshot;
  origin: ContractorOriginSnapshot;
  work: ContractorWorkSnapshot;
  location: ContractorLocationSnapshot;
  diagnostics: {
    sourceVersion: string;
    currentWorkState: ContractorCanonicalCurrentWorkState;
    contractorNameSource: ContractorContractorNameSource;
    objectNameSource: ContractorObjectNameSource;
    eligibility: ContractorCanonicalEligibility;
  };
};

export type ContractorInboxScope = {
  rows: ContractorInboxRow[];
  meta: {
    rowsSource: string;
    candidateView: string;
    readyRows: number;
    scopeReadyCandidates: number;
    readyCurrentRows: number;
    readyCurrentDegradedTitle: number;
    legacyFilteredOut: number;
    historicalExcluded: number;
    invalidMissingContractor: number;
    invalidMissingWorkSnapshot: number;
    invalidMissingObjectSnapshot: number;
    invalidMaterialOnly: number;
  };
};

export type ContractorLinkedRequestCard = {
  requestId: string;
  reqNo: string;
  status: string | null;
  issueNos: string[];
};

export type ContractorWarehouseIssueRow = {
  issueItemId: string;
  matCode: string | null;
  requestId: string | null;
  title: string;
  unit: string | null;
  qty: number;
  qtyLeft: number;
  qtyUsed: number;
  price: number | null;
  sum: number | null;
};

export type WarehouseIssuesPanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; rows: ContractorWarehouseIssueRow[]; linkedRequestCards: ContractorLinkedRequestCard[] }
  | { status: "empty"; message: string; linkedRequestCards: ContractorLinkedRequestCard[] }
  | { status: "error"; message: string; linkedRequestCards: ContractorLinkedRequestCard[] };

export type ContractorFactScope = {
  row: ContractorInboxRow;
  warehouseIssuesPanel: WarehouseIssuesPanelState;
  meta: {
    sourceVersion: string;
    candidateView: string;
    linkedRequestCount: number;
    issuedRowCount: number;
  };
};

type ScopeParams = {
  supabaseClient: SupabaseClient<Database>;
  myContractorId: string | null;
  isStaff: boolean;
};

type FactParams = ScopeParams & {
  workItemId: string;
};

const FACT_EMPTY_MESSAGES: Record<string, string> = {
  no_approved_requests: "Нет утвержденных заявок для подтягивания материалов.",
  waiting_requests: "Часть заявок еще в ожидании, поэтому выдачи могут отображаться не полностью.",
  no_confirmed_warehouse_issues: "По этой работе еще не подтверждены выдачи материалов.",
  not_found: "Не удалось загрузить данные подрядной работы.",
};

const asRecord = (value: unknown, scope: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${scope} must be an object`);
  }
  return value as Record<string, unknown>;
};

const asArray = (value: unknown, scope: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${scope} must be an array`);
  }
  return value;
};

const asString = (value: unknown, scope: string): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${scope} must be a non-empty string`);
  return normalized;
};

const asNullableString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const asRuText = (value: unknown, scope: string): string => {
  const normalized = String(normalizeRuText(asString(value, scope)) ?? "").trim();
  if (!normalized) throw new Error(`${scope} must be a non-empty string`);
  return normalized;
};

const asNullableRuText = (value: unknown): string | null => {
  const normalized = String(normalizeRuText(asNullableString(value)) ?? "").trim();
  return normalized || null;
};

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asNullableNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePublicationState = (value: unknown, scope: string): ContractorPublicationState => {
  const normalized = asString(value, scope);
  switch (normalized) {
    case "ready":
    case "invalid_missing_contractor":
    case "invalid_missing_work_snapshot":
    case "invalid_missing_object_snapshot":
    case "invalid_material_only":
      return normalized;
    default:
      throw new Error(`${scope} has unsupported publicationState: ${normalized}`);
  }
};

const parseSourceKind = (value: unknown, scope: string): ContractorSourceKind => {
  const normalized = asString(value, scope);
  switch (normalized) {
    case "buyer_subcontract":
    case "foreman_subcontract_request":
    case "foreman_material_request":
      return normalized;
    default:
      throw new Error(`${scope} has unsupported sourceKind: ${normalized}`);
  }
};

const parseWorkNameSource = (value: unknown, scope: string): ContractorWorkNameSource => {
  const normalized = asString(value, scope);
  switch (normalized) {
    case "snapshot":
    case "resolver":
    case "raw_code":
      return normalized;
    default:
      throw new Error(`${scope} has unsupported workNameSource: ${normalized}`);
  }
};

const parseCurrentWorkState = (
  value: unknown,
  fallback: ContractorCanonicalCurrentWorkState,
): ContractorCanonicalCurrentWorkState => {
  const normalized = asNullableString(value);
  switch (normalized) {
    case "ready_current":
    case "ready_current_degraded_title":
    case "legacy_filtered_out":
    case "historical_excluded":
      return normalized;
    default:
      return fallback;
  }
};

const parseContractorNameSource = (
  value: unknown,
  fallback: ContractorContractorNameSource,
): ContractorContractorNameSource => {
  const normalized = asNullableString(value);
  switch (normalized) {
    case "subcontract_snapshot":
    case "request_snapshot":
    case "canonical_view":
      return normalized;
    default:
      return fallback;
  }
};

const parseObjectNameSource = (
  value: unknown,
  fallback: ContractorObjectNameSource,
): ContractorObjectNameSource => {
  const normalized = asNullableString(value);
  switch (normalized) {
    case "request_snapshot":
    case "subcontract_snapshot":
    case "canonical_view":
    case "resolver":
    case "raw_code":
      return normalized;
    default:
      return fallback;
  }
};

const parseEligibility = (
  value: unknown,
  fallbackState: ContractorCanonicalCurrentWorkState,
): ContractorCanonicalEligibility => {
  const record = value ? asRecord(value, "contractor_inbox_scope_v1.rows[].diagnostics.eligibility") : null;
  return {
    isApprovedWork: record?.isApprovedWork === true || record == null,
    isCurrentVisibleWork:
      record?.isCurrentVisibleWork === true ||
      fallbackState === "ready_current" ||
      fallbackState === "ready_current_degraded_title",
    isLegacyHistoricalRow:
      record?.isLegacyHistoricalRow === true ||
      fallbackState === "legacy_filtered_out" ||
      fallbackState === "historical_excluded",
    hasHumanTitle:
      record?.hasHumanTitle === true ||
      (record?.hasHumanTitle !== false && fallbackState !== "legacy_filtered_out"),
    hasCurrentObjectContext:
      record?.hasCurrentObjectContext === true ||
      (record?.hasCurrentObjectContext !== false && fallbackState !== "legacy_filtered_out"),
  };
};

const parseIdentity = (value: unknown, scope: string): ContractorIdentitySnapshot => {
  const record = asRecord(value, scope);
  return {
    contractorId: asString(record.contractorId, `${scope}.contractorId`),
    contractorName: asRuText(record.contractorName, `${scope}.contractorName`),
    contractorInn: asNullableRuText(record.contractorInn),
    contractNumber: asNullableRuText(record.contractNumber),
    contractDate: asNullableRuText(record.contractDate),
  };
};

const parseOrigin = (value: unknown, scope: string): ContractorOriginSnapshot => {
  const record = asRecord(value, scope);
  return {
    sourceKind: parseSourceKind(record.sourceKind, `${scope}.sourceKind`),
    sourceRequestId: asNullableString(record.sourceRequestId),
    sourceProposalId: asNullableString(record.sourceProposalId),
    sourceSubcontractId: asNullableString(record.sourceSubcontractId),
    directorApprovedAt: asString(record.directorApprovedAt, `${scope}.directorApprovedAt`),
  };
};

const parseWork = (value: unknown, scope: string): ContractorWorkSnapshot => {
  const record = asRecord(value, scope);
  return {
    workItemId: asString(record.workItemId, `${scope}.workItemId`),
    workName: asRuText(record.workName, `${scope}.workName`),
    workNameSource: parseWorkNameSource(record.workNameSource, `${scope}.workNameSource`),
    quantity: asNullableNumber(record.quantity),
    uom: asNullableRuText(record.uom),
    unitPrice: asNullableNumber(record.unitPrice),
    totalAmount: asNullableNumber(record.totalAmount),
    isMaterial: record.isMaterial === true,
  };
};

const parseLocation = (value: unknown, scope: string): ContractorLocationSnapshot => {
  const record = asRecord(value, scope);
  const objectName = asNullableRuText(record.objectName) ?? asNullableRuText(record.locationDisplay) ?? "";
  const locationDisplay = asNullableRuText(record.locationDisplay) ?? objectName;
  if (!objectName || !locationDisplay) {
    throw new Error(`${scope} requires objectName/locationDisplay`);
  }
  return {
    objectId: asNullableString(record.objectId),
    objectName,
    systemName: asNullableRuText(record.systemName),
    zoneName: asNullableRuText(record.zoneName),
    floorName: asNullableRuText(record.floorName),
    locationDisplay,
  };
};

const parseInboxRow = (value: unknown, scope: string): ContractorInboxRow => {
  const record = asRecord(value, scope);
  const publicationState = parsePublicationState(record.publicationState, `${scope}.publicationState`);
  if (publicationState !== "ready") {
    throw new Error(`${scope} must be ready for product inbox`);
  }
  const work = parseWork(record.work, `${scope}.work`);
  const diagnosticsRecord = asRecord(record.diagnostics ?? {}, `${scope}.diagnostics`);
  const fallbackCurrentState =
    work.workNameSource === "raw_code" ? "ready_current_degraded_title" : "ready_current";
  const currentWorkState = parseCurrentWorkState(diagnosticsRecord.currentWorkState, fallbackCurrentState);
  return {
    workItemId: asString(record.workItemId, `${scope}.workItemId`),
    progressId: asNullableString(record.progressId),
    publicationState,
    identity: parseIdentity(record.identity, `${scope}.identity`),
    origin: parseOrigin(record.origin, `${scope}.origin`),
    work,
    location: parseLocation(record.location, `${scope}.location`),
    diagnostics: {
      sourceVersion: asNullableString(diagnosticsRecord.sourceVersion) ?? "v1",
      currentWorkState,
      contractorNameSource: parseContractorNameSource(
        diagnosticsRecord.contractorNameSource,
        "canonical_view",
      ),
      objectNameSource: parseObjectNameSource(diagnosticsRecord.objectNameSource, "canonical_view"),
      eligibility: parseEligibility(diagnosticsRecord.eligibility, currentWorkState),
    },
  };
};

const parseLinkedRequestCards = (value: unknown, scope: string): ContractorLinkedRequestCard[] =>
  asArray(value, scope).map((entry, index) => {
    const record = asRecord(entry, `${scope}[${index}]`);
    return {
      requestId: asString(record.requestId, `${scope}[${index}].requestId`),
      reqNo: asString(record.reqNo, `${scope}[${index}].reqNo`),
      status: asNullableString(record.status),
      issueNos: asArray(record.issueNos ?? [], `${scope}[${index}].issueNos`).map((item, itemIndex) =>
        asString(item, `${scope}[${index}].issueNos[${itemIndex}]`),
      ),
    };
  });

const parseWarehouseIssueRows = (value: unknown, scope: string): ContractorWarehouseIssueRow[] =>
  asArray(value, scope).map((entry, index) => {
    const record = asRecord(entry, `${scope}[${index}]`);
    return {
      issueItemId: asString(record.issueItemId, `${scope}[${index}].issueItemId`),
      matCode: asNullableString(record.matCode),
      requestId: asNullableString(record.requestId),
      title: asString(record.title, `${scope}[${index}].title`),
      unit: asNullableString(record.unit),
      qty: asNumber(record.qty, 0),
      qtyLeft: asNumber(record.qtyLeft, 0),
      qtyUsed: asNumber(record.qtyUsed, 0),
      price: asNullableNumber(record.price),
      sum: asNullableNumber(record.sum),
    };
  });

const parseInboxScope = (value: unknown): ContractorInboxScope => {
  const root = asRecord(value, "contractor_inbox_scope_v1");
  if (asString(root.document_type, "contractor_inbox_scope_v1.document_type") !== "contractor_inbox_scope") {
    throw new Error("contractor_inbox_scope_v1 invalid document_type");
  }
  if (asString(root.version, "contractor_inbox_scope_v1.version") !== "v1") {
    throw new Error("contractor_inbox_scope_v1 invalid version");
  }
  const meta = asRecord(root.meta ?? {}, "contractor_inbox_scope_v1.meta");
  return {
    rows: parseRows(root.rows, "contractor_inbox_scope_v1.rows"),
    meta: {
      rowsSource: asString(meta.rowsSource, "contractor_inbox_scope_v1.meta.rowsSource"),
      candidateView: asString(meta.candidateView, "contractor_inbox_scope_v1.meta.candidateView"),
      readyRows: asNumber(meta.readyRows, 0),
      scopeReadyCandidates: asNumber(meta.scopeReadyCandidates, 0),
      readyCurrentRows: asNumber(meta.readyCurrentRows, 0),
      readyCurrentDegradedTitle: asNumber(meta.readyCurrentDegradedTitle, 0),
      legacyFilteredOut: asNumber(meta.legacyFilteredOut, 0),
      historicalExcluded: asNumber(meta.historicalExcluded, 0),
      invalidMissingContractor: asNumber(meta.invalidMissingContractor, 0),
      invalidMissingWorkSnapshot: asNumber(meta.invalidMissingWorkSnapshot, 0),
      invalidMissingObjectSnapshot: asNumber(meta.invalidMissingObjectSnapshot, 0),
      invalidMaterialOnly: asNumber(meta.invalidMaterialOnly, 0),
    },
  };
};

function parseRows(value: unknown, scope: string): ContractorInboxRow[] {
  return asArray(value, scope).map((entry, index) => parseInboxRow(entry, `${scope}[${index}]`));
}

const parseWarehouseIssuesPanel = (value: unknown): WarehouseIssuesPanelState => {
  const record = asRecord(value, "contractor_fact_scope_v1.warehouseIssuesPanel");
  const status = asString(record.status, "contractor_fact_scope_v1.warehouseIssuesPanel.status");
  const linkedRequestCards = parseLinkedRequestCards(
    record.linkedRequestCards ?? [],
    "contractor_fact_scope_v1.warehouseIssuesPanel.linkedRequestCards",
  );
  switch (status) {
    case "ready":
      return {
        status: "ready",
        rows: parseWarehouseIssueRows(record.rows ?? [], "contractor_fact_scope_v1.warehouseIssuesPanel.rows"),
        linkedRequestCards,
      };
    case "empty":
      return {
        status: "empty",
        message:
          FACT_EMPTY_MESSAGES[asNullableString(record.messageCode) ?? ""] ??
          "По этой работе еще не подтверждены выдачи материалов.",
        linkedRequestCards,
      };
    case "error":
      return {
        status: "error",
        message:
          FACT_EMPTY_MESSAGES[asNullableString(record.messageCode) ?? ""] ??
          "Не удалось загрузить выдачи со склада.",
        linkedRequestCards,
      };
    default:
      throw new Error(`contractor_fact_scope_v1.warehouseIssuesPanel has unsupported status: ${status}`);
  }
};

const parseFactScope = (value: unknown): ContractorFactScope => {
  const root = asRecord(value, "contractor_fact_scope_v1");
  if (asString(root.document_type, "contractor_fact_scope_v1.document_type") !== "contractor_fact_scope") {
    throw new Error("contractor_fact_scope_v1 invalid document_type");
  }
  if (asString(root.version, "contractor_fact_scope_v1.version") !== "v1") {
    throw new Error("contractor_fact_scope_v1 invalid version");
  }
  const meta = asRecord(root.meta ?? {}, "contractor_fact_scope_v1.meta");
  return {
    row: parseInboxRow(root.row, "contractor_fact_scope_v1.row"),
    warehouseIssuesPanel: parseWarehouseIssuesPanel(root.warehouseIssuesPanel),
    meta: {
      sourceVersion: asNullableString(meta.sourceVersion) ?? "v1",
      candidateView: asNullableString(meta.candidateView) ?? "v_contractor_publication_candidates_v1",
      linkedRequestCount: asNumber(meta.linkedRequestCount, 0),
      issuedRowCount: asNumber(meta.issuedRowCount, 0),
    },
  };
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "contractor_scope_error");

export async function loadContractorInboxScope(params: ScopeParams): Promise<ContractorInboxScope> {
  const observation = beginPlatformObservability({
    screen: "contractor",
    surface: "inbox_scope",
    category: "fetch",
    event: "load_inbox_scope",
    sourceKind: "rpc:contractor_inbox_scope_v1",
  });
  try {
    const { data, error } = await params.supabaseClient.rpc("contractor_inbox_scope_v1" as never, {
      p_my_contractor_id: params.myContractorId,
      p_is_staff: params.isStaff,
    } as never);
    if (error) throw error;
    const scope = parseInboxScope(data);
    observation.success({
      rowCount: scope.rows.length,
      sourceKind: "rpc:contractor_inbox_scope_v1",
      extra: {
        readyRows: scope.meta.readyRows,
        readyCurrentRows: scope.meta.readyCurrentRows,
        readyCurrentDegradedTitle: scope.meta.readyCurrentDegradedTitle,
        legacyFilteredOut: scope.meta.legacyFilteredOut,
        historicalExcluded: scope.meta.historicalExcluded,
        invalidMissingContractor: scope.meta.invalidMissingContractor,
        invalidMaterialOnly: scope.meta.invalidMaterialOnly,
      },
    });
    return scope;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "contractor_inbox_scope_v1",
      sourceKind: "rpc:contractor_inbox_scope_v1",
    });
    throw error;
  }
}

export async function loadContractorFactScope(params: FactParams): Promise<ContractorFactScope> {
  const observation = beginPlatformObservability({
    screen: "contractor",
    surface: "fact_scope",
    category: "fetch",
    event: "load_fact_scope",
    sourceKind: "rpc:contractor_fact_scope_v1",
  });
  try {
    const { data, error } = await params.supabaseClient.rpc("contractor_fact_scope_v1" as never, {
      p_work_item_id: params.workItemId,
      p_my_contractor_id: params.myContractorId,
      p_is_staff: params.isStaff,
    } as never);
    if (error) throw error;
    if (!data) throw new Error("contractor_fact_scope_v1 returned empty payload");
    const scope = parseFactScope(data);
    observation.success({
      rowCount: 1,
      sourceKind: "rpc:contractor_fact_scope_v1",
      extra: {
        workItemId: scope.row.workItemId,
        warehouseIssuesStatus: scope.warehouseIssuesPanel.status,
        linkedRequestCount: scope.meta.linkedRequestCount,
      },
    });
    return scope;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "contractor_fact_scope_v1",
      sourceKind: "rpc:contractor_fact_scope_v1",
      errorMessage: toErrorMessage(error),
    });
    throw error;
  }
}

export const contractorWarehouseIssuesLoadingState = (): WarehouseIssuesPanelState => ({
  status: "loading",
});

export const contractorWarehouseIssuesIdleState = (): WarehouseIssuesPanelState => ({
  status: "idle",
});

export const contractorWarehouseIssuesErrorState = (message: string): WarehouseIssuesPanelState => ({
  status: "error",
  message,
  linkedRequestCards: [],
});

export const recordContractorCanonicalDiagnostic = (event: string, extra?: Record<string, unknown>) =>
  recordPlatformObservability({
    screen: "contractor",
    surface: "canonical_scope",
    category: "ui",
    event,
    result: "success",
    extra: {
      owner: "canonical_scope",
      ...extra,
    },
  });
