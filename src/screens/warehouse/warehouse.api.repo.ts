import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfAborted } from "../../lib/requestCancellation";
import { callWarehouseApiBffRead } from "./warehouse.api.bff.client";
import {
  WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS,
  type WarehouseApiBffPayloadDto,
  type WarehouseApiBffReadResultDto,
  type WarehouseApiBffRequestDto,
} from "./warehouse.api.bff.contract";
import {
  callWarehouseApiSupabaseIncomingLedgerRows,
  callWarehouseApiSupabaseIncomingLineRows,
  callWarehouseApiSupabaseIncomingHeadsScope,
  callWarehouseApiSupabaseIncomingItemsScope,
  callWarehouseApiSupabaseIncomingReportRows,
  callWarehouseApiSupabaseIssueItemsScope,
  callWarehouseApiSupabaseIssueLineRows,
  callWarehouseApiSupabaseIssueQueueScope,
  callWarehouseApiSupabaseIssuedByObjectFastRows,
  callWarehouseApiSupabaseIssuedMaterialsFastRows,
  callWarehouseApiSupabaseReportsBundle,
  callWarehouseApiSupabaseStockScope,
  type WarehouseApiEnvelopeResult,
  type WarehouseApiRepoResult,
  type WarehouseApiReportsBundleResult,
  type WarehouseApiUnknownRow,
} from "./warehouse.api.repo.transport";

type UnknownRow = WarehouseApiUnknownRow;

const buildPageCeilingError = (maxRows: number) =>
  new Error(`Paged reference read exceeded max row ceiling (${maxRows})`);

const buildPageCountCeilingError = (maxPages: number) =>
  new Error(`Paged reference read exceeded max page ceiling (${maxPages})`);

const bffReadResultToRepoResult = (result: WarehouseApiBffReadResultDto): WarehouseApiRepoResult => ({
  data: result.data,
  error: result.error,
});

const bffErrorToRepoResult = (error: { code: string; message: string }): WarehouseApiRepoResult => ({
  data: null,
  error,
});

const bffErrorToEnvelopeResult = (error: { code: string; message: string }): WarehouseApiEnvelopeResult => ({
  data: null,
  error,
});

const getSingleBffResult = (payload: WarehouseApiBffPayloadDto): WarehouseApiRepoResult | null =>
  payload.kind === "single" ? bffReadResultToRepoResult(payload.result) : null;

const getEnvelopeBffResult = (payload: WarehouseApiBffPayloadDto): WarehouseApiEnvelopeResult | null => {
  if (payload.kind !== "single") return null;
  if (payload.result.error) return { data: null, error: payload.result.error };
  const first = Array.isArray(payload.result.data) ? payload.result.data[0] : null;
  if (!first || typeof first !== "object" || Array.isArray(first)) {
    return { data: null, error: null };
  }
  return {
    data: Object.prototype.hasOwnProperty.call(first, "payload") ? first.payload : first,
    error: null,
  };
};

const fetchWarehouseApiBffSingleRead = async (
  request: WarehouseApiBffRequestDto,
): Promise<WarehouseApiRepoResult | "unavailable"> => {
  const bffResult = await callWarehouseApiBffRead(request);
  if (bffResult.status === "unavailable") return "unavailable";
  if (bffResult.status === "error") return bffErrorToRepoResult(bffResult.error);
  return getSingleBffResult(bffResult.response.payload) ?? bffErrorToRepoResult({
    code: "WAREHOUSE_API_BFF_INVALID_RESPONSE",
    message: "Invalid warehouse API read response",
  });
};

const fetchWarehouseApiBffEnvelopeRead = async (
  request: WarehouseApiBffRequestDto,
): Promise<WarehouseApiEnvelopeResult | "unavailable"> => {
  const bffResult = await callWarehouseApiBffRead(request);
  if (bffResult.status === "unavailable") return "unavailable";
  if (bffResult.status === "error") return bffErrorToEnvelopeResult(bffResult.error);
  return getEnvelopeBffResult(bffResult.response.payload) ?? bffErrorToEnvelopeResult({
    code: "WAREHOUSE_API_BFF_INVALID_RESPONSE",
    message: "Invalid warehouse API read response",
  });
};

const fetchWarehouseApiBffRowsPage = async (
  request: WarehouseApiBffRequestDto,
  page: number,
  pageSize: number,
): Promise<WarehouseApiRepoResult | "unavailable"> =>
  fetchWarehouseApiBffSingleRead({
    ...request,
    page: { page, pageSize },
  } as WarehouseApiBffRequestDto);

const loadWarehouseApiBffRowsWithCeiling = async (
  request: WarehouseApiBffRequestDto,
): Promise<WarehouseApiRepoResult | "unavailable"> => {
  const pageSize = WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS.pageSize;
  const maxRows = WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS.maxRows;
  const maxPages = WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS.maxPages;
  const rows: UnknownRow[] = [];

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const from = pageIndex * pageSize;
    if (from >= maxRows) {
      const probe = await fetchWarehouseApiBffRowsPage(request, pageIndex, pageSize);
      if (probe === "unavailable") return "unavailable";
      if (probe.error) return probe;
      const probeRows = Array.isArray(probe.data) ? probe.data : [];
      return probeRows.length
        ? { data: null, error: buildPageCeilingError(maxRows) }
        : { data: rows, error: null };
    }

    const response = await fetchWarehouseApiBffRowsPage(request, pageIndex, pageSize);
    if (response === "unavailable") return "unavailable";
    if (response.error) return response;

    const pageRows = Array.isArray(response.data) ? response.data : [];
    if (rows.length + pageRows.length > maxRows) {
      return { data: null, error: buildPageCeilingError(maxRows) };
    }
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return { data: rows, error: null };
  }

  return { data: null, error: buildPageCountCeilingError(maxPages) };
};

export async function fetchWarehouseReportsBundle(
  supabase: SupabaseClient,
  periodFrom?: string | null,
  periodTo?: string | null,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiReportsBundleResult> {
  throwIfAborted(options?.signal);
  const bffResult = await callWarehouseApiBffRead({
    operation: "warehouse.api.reports.bundle",
    args: {
      p_from: periodFrom || null,
      p_to: periodTo || null,
    },
  });
  throwIfAborted(options?.signal);

  if (bffResult.status === "ok" && bffResult.response.payload.kind === "reports_bundle") {
    return {
      stock: bffReadResultToRepoResult(bffResult.response.payload.result.stock),
      movement: bffReadResultToRepoResult(bffResult.response.payload.result.movement),
      issues: bffReadResultToRepoResult(bffResult.response.payload.result.issues),
    };
  }

  if (bffResult.status === "error") {
    const errorResult = bffErrorToRepoResult(bffResult.error);
    return { stock: errorResult, movement: errorResult, issues: errorResult };
  }

  return await callWarehouseApiSupabaseReportsBundle(
    supabase,
    periodFrom,
    periodTo,
    { signal: options?.signal },
  );
}

export async function fetchWarehouseIssueLineRows(
  supabase: SupabaseClient,
  issueId: number,
): Promise<WarehouseApiRepoResult> {
  const bffResult = await fetchWarehouseApiBffSingleRead({
    operation: "warehouse.api.report.issue_lines",
    args: { p_issue_id: issueId },
  });
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIssueLineRows(supabase, issueId);
}

export async function fetchWarehouseIssuedMaterialsFastRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiRepoResult> {
  throwIfAborted(options?.signal);
  const bffResult = await fetchWarehouseApiBffSingleRead({
    operation: "warehouse.api.report.issued_materials_fast",
    args: {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
      p_object_id: p.objectId ?? null,
    },
  });
  throwIfAborted(options?.signal);

  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIssuedMaterialsFastRows(supabase, p, options);
}

export async function fetchWarehouseIssuedByObjectFastRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiRepoResult> {
  throwIfAborted(options?.signal);
  const bffResult = await fetchWarehouseApiBffSingleRead({
    operation: "warehouse.api.report.issued_by_object_fast",
    args: {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
      p_object_id: p.objectId ?? null,
    },
  });
  throwIfAborted(options?.signal);

  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIssuedByObjectFastRows(supabase, p, options);
}

export async function fetchWarehouseIncomingReportRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiRepoResult> {
  throwIfAborted(options?.signal);
  const bffResult = await fetchWarehouseApiBffSingleRead({
    operation: "warehouse.api.report.incoming_v2",
    args: {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
    },
  });
  throwIfAborted(options?.signal);

  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIncomingReportRows(supabase, p, options);
}

export async function fetchWarehouseIncomingLedgerRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
): Promise<WarehouseApiRepoResult> {
  const bffResult = await loadWarehouseApiBffRowsWithCeiling({
    operation: "warehouse.api.ledger.incoming",
    args: {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
    },
  });
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIncomingLedgerRows(supabase, p);
}

export async function fetchWarehouseIncomingLineRows(
  supabase: SupabaseClient,
  incomingId: string,
): Promise<WarehouseApiRepoResult> {
  const bffResult = await loadWarehouseApiBffRowsWithCeiling({
    operation: "warehouse.api.ledger.incoming_lines",
    args: { incomingId },
  });
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIncomingLineRows(supabase, incomingId);
}

export async function fetchWarehouseIncomingHeadsScope(
  supabase: SupabaseClient,
  pageOffset: number,
  pageSize: number,
): Promise<WarehouseApiEnvelopeResult> {
  const bffResult = await fetchWarehouseApiBffEnvelopeRead({
    operation: "warehouse.api.incoming.queue",
    args: { p_offset: pageOffset, p_limit: pageSize },
  });
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIncomingHeadsScope(supabase, pageOffset, pageSize);
}

export async function fetchWarehouseIncomingItemsScope(
  supabase: SupabaseClient,
  incomingId: string,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiEnvelopeResult> {
  throwIfAborted(options?.signal);
  const bffResult = await fetchWarehouseApiBffEnvelopeRead({
    operation: "warehouse.api.incoming.items",
    args: { p_incoming_id: incomingId },
  });
  throwIfAborted(options?.signal);
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIncomingItemsScope(supabase, incomingId, options);
}

export async function fetchWarehouseIssueQueueScope(
  supabase: SupabaseClient,
  offset: number,
  pageSize: number,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiEnvelopeResult> {
  throwIfAborted(options?.signal);
  const bffResult = await fetchWarehouseApiBffEnvelopeRead({
    operation: "warehouse.api.issue.queue",
    args: { p_offset: offset, p_limit: pageSize },
  });
  throwIfAborted(options?.signal);
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIssueQueueScope(supabase, offset, pageSize, options);
}

export async function fetchWarehouseIssueItemsScope(
  supabase: SupabaseClient,
  requestId: string,
): Promise<WarehouseApiEnvelopeResult> {
  const bffResult = await fetchWarehouseApiBffEnvelopeRead({
    operation: "warehouse.api.issue.items",
    args: { p_request_id: requestId },
  });
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseIssueItemsScope(supabase, requestId);
}

export async function fetchWarehouseStockScope(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<WarehouseApiEnvelopeResult> {
  const bffResult = await fetchWarehouseApiBffEnvelopeRead({
    operation: "warehouse.api.stock.scope",
    args: { p_offset: offset, p_limit: limit },
  });
  if (bffResult !== "unavailable") return bffResult;
  return await callWarehouseApiSupabaseStockScope(supabase, offset, limit);
}

export function asUnknownRows(data: unknown): UnknownRow[] {
  return Array.isArray(data) ? (data as UnknownRow[]) : [];
}
