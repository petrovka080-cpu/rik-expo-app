import { supabase } from "../supabaseClient";
import type {
  DirectorFactContextResolved,
  DirectorFactRow,
  RequestLookupRow,
} from "./director_reports.shared";
import {
  firstNonEmpty,
  forEachChunkParallel,
  matchesDirectorObjectIdentity,
  normalizeDirectorFactRow,
  normalizeDirectorFactViewRow,
  resolveDirectorFactContext,
  toRangeEnd,
  toRangeStart,
} from "./director_reports.shared";
import {
  fetchIssueHeadsViaAccRpc,
  fetchIssueLinesViaAccRpc,
  fetchRequestsRowsSafe,
} from "./director_reports.transport.base";
import { loadDirectorRequestContextLookups } from "./director_reports.transport.lookups";
import { recordDirectorReportsTransportWarning } from "./director_reports.observability";

async function fetchDirectorFactViaAccRpc(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const heads = await fetchIssueHeadsViaAccRpc({ from: p.from, to: p.to });
  if (!heads.length) return [];

  const allIssueIds = Array.from(
    new Set(
      heads
        .map((head) => String(head.issue_id ?? "").trim())
        .filter((id) => id !== ""),
    ),
  );
  if (!allIssueIds.length) return [];

  const requestIds = Array.from(
    new Set(
      heads
        .map((head) => String(head.request_id ?? "").trim())
        .filter((id) => id !== ""),
    ),
  );

  const linesPromise = p.objectName == null ? fetchIssueLinesViaAccRpc(allIssueIds) : null;
  const reqById = new Map<string, RequestLookupRow>();
  await forEachChunkParallel(requestIds, 100, 4, async (ids) => {
    try {
      const rows = await fetchRequestsRowsSafe(ids);
      for (const row of rows) {
        const id = String(row?.id ?? "").trim();
        if (id) reqById.set(id, row);
      }
    } catch (error) {
      recordDirectorReportsTransportWarning("request_lookup_chunk_failed", error, {
        chunkSize: ids.length,
        requestIdCount: requestIds.length,
      });
    }
  });

  const {
    objectNameById,
    objectTypeNameByCode,
    systemNameByCode,
  } = await loadDirectorRequestContextLookups({
    requests: reqById.values(),
  });

  const headCtxByIssueId = new Map<
    string,
    {
      issueId: string;
      issDate: string;
      context: DirectorFactContextResolved;
    }
  >();
  for (const head of heads) {
    const issueId = String(head?.issue_id ?? "").trim();
    if (!issueId) continue;
    const reqId = String(head?.request_id ?? "").trim();
    const request = reqId ? (reqById.get(reqId) ?? null) : null;
    const context = resolveDirectorFactContext({
      request_id: reqId,
      request,
      issue_note: head?.note ?? null,
      request_object_name_by_id: objectNameById.get(String(request?.object_id ?? "").trim()) ?? null,
      request_object_type_name: firstNonEmpty(
        objectTypeNameByCode.get(String(request?.object_type_code ?? "").trim()),
        request?.object_type_code,
      ) || null,
      request_system_name: firstNonEmpty(
        systemNameByCode.get(String(request?.system_code ?? "").trim()),
        request?.system_code,
      ) || null,
      request_zone_name: request?.zone_code ?? null,
    });

    if (!matchesDirectorObjectIdentity(p.objectName, context)) continue;

    headCtxByIssueId.set(issueId, {
      issueId,
      issDate: String(head?.event_dt ?? ""),
      context,
    });
  }

  if (!headCtxByIssueId.size) return [];
  const issueIds = Array.from(headCtxByIssueId.keys());
  const lines = linesPromise ?? fetchIssueLinesViaAccRpc(issueIds);
  const resolvedLines = await lines;
  if (!resolvedLines.length) return [];

  const out: DirectorFactRow[] = [];
  for (const line of resolvedLines) {
    const issueId = String(line?.issue_id ?? "").trim();
    const ctx = headCtxByIssueId.get(issueId);
    if (!ctx) continue;
    const row = normalizeDirectorFactRow({
      issue_id: issueId,
      iss_date: ctx.issDate,
      context: ctx.context,
      material_name: firstNonEmpty(line?.name_human, line?.rik_code),
      rik_code: line?.rik_code,
      uom: line?.uom,
      qty: line?.qty_total,
    });
    if (row) out.push(row);
  }

  return out;
}

async function fetchAllFactRowsFromView(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const pageSize = 1000;
  const out: DirectorFactRow[] = [];
  let fromIdx = 0;

  while (true) {
    let query = supabase
      .from("v_director_issued_fact_rows" as never)
      .select("issue_id,iss_date,object_name,work_name,rik_code,material_name_ru,uom,qty,is_without_request");
    if (p.from) query = query.gte("iss_date", toRangeStart(p.from));
    if (p.to) query = query.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) query = query.eq("object_name", p.objectName);

    query = query
      .order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await query;
    if (error) throw error;

    const rows = Array.isArray(data)
      ? data.map(normalizeDirectorFactViewRow).filter((row): row is DirectorFactRow => !!row)
      : [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }

  return out;
}

export {
  fetchAllFactRowsFromView,
  fetchDirectorFactViaAccRpc,
};
