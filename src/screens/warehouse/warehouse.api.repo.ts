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
  callWarehouseApiSupabaseIncomingReportRows,
  callWarehouseApiSupabaseIssueLineRows,
  callWarehouseApiSupabaseIssuedByObjectFastRows,
  callWarehouseApiSupabaseIssuedMaterialsFastRows,
  callWarehouseApiSupabaseReportsBundle,
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

const getSingleBffResult = (payload: WarehouseApiBffPayloadDto): WarehouseApiRepoResult | null =>
  payload.kind === "single" ? bffReadResultToRepoResult(payload.result) : null;

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

export function asUnknownRows(data: unknown): UnknownRow[] {
  return Array.isArray(data) ? (data as UnknownRow[]) : [];
}
