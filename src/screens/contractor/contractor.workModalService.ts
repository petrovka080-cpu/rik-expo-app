import {
  fetchRequestScopeRows,
  getProgressIdsForSubcontract,
  loadConsumedByCode,
} from "./contractor.data";
import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IssuedItemRow, LinkedReqCard } from "./types";
import type { Database } from "../../lib/database.types";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { loadPagedRowsWithCeiling, type PagedQuery } from "../../lib/api/_core";

type WorkRowLike = {
  progress_id: string;
  work_name?: string | null;
  work_code?: string | null;
  object_name?: string | null;
  uom_id?: string | null;
  qty_planned?: number | null;
  request_id?: string | null;
  contractor_job_id?: string | null;
};

const WORK_MODAL_REFERENCE_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

type RequestHeaderRow = {
  display_no?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  contractor_org?: string | null;
  contractor_phone?: string | null;
};

type SubcontractHeaderRow = {
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_rep?: string | null;
  contractor_phone?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  object_name?: string | null;
  work_type?: string | null;
  work_zone?: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  price_per_unit?: number | null;
  total_price?: number | null;
  date_start?: string | null;
  date_end?: string | null;
};

type RequestDisplayRow = {
  id?: string | null;
  display_no?: string | null;
  request_no?: string | null;
  status?: string | null;
};
let requestsHasRequestNoInWorkModalCache: boolean | null = null;

type WarehouseIssueHeadRow = {
  id?: string | number | null;
  request_id?: string | number | null;
  base_no?: string | null;
};

type IssueReqHeadUiRow = {
  request_id?: string | null;
  submitted_at?: string | null;
  issue_status?: string | null;
  qty_issued_sum?: number | null;
};

type IssueReqItemUiRow = {
  request_item_id?: string | null;
  rik_code?: string | null;
  request_id?: string | null;
  name_human?: string | null;
  uom?: string | null;
  qty_issued?: number | null;
  price?: number | null;
};

type WorkProgressLogRow = {
  id?: string | null;
  qty?: number | null;
  work_uom?: string | null;
  stage_note?: string | null;
  note?: string | null;
};

type WorkProgressLogMaterialRow = {
  mat_code?: string | null;
  uom_mat?: string | null;
  qty_fact?: number | null;
};

type CatalogItemRow = {
  rik_code?: string | null;
  name_human_ru?: string | null;
  name_human?: string | null;
  uom_code?: string | null;
};

type WorkDefaultMaterialRow = {
  mat_code?: string | null;
  uom?: string | null;
};

type WorkStageRow = {
  code?: string | null;
  name?: string | null;
};

type RequestNoProbeRow = {
  id?: string | null;
  request_no?: string | null;
};

type CatalogMeta = {
  name: string;
  uom: string | null;
};

const recordContractorWorkModalFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "contractor",
    surface: "work_modal_service",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "contractor_work_modal_fallback"),
    extra: {
      module: "contractor.workModalService",
      route: "/contractor",
      role: "contractor",
      owner: "work_modal_service",
      severity: "error",
      ...extra,
    },
  });

const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const WORK_MODAL_SUBCONTRACT_SELECT = [
  "contractor_org",
  "contractor_inn",
  "contractor_rep",
  "contractor_phone",
  "contract_number",
  "contract_date",
  "object_name",
  "work_type",
  "work_zone",
  "qty_planned",
  "uom",
  "price_per_unit",
  "total_price",
  "date_start",
  "date_end",
].join(", ");

const WORK_DEFAULT_MATERIALS_SELECT = "mat_code, uom";

const asArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const normalizeRequestHeaderRow = (row: unknown): RequestHeaderRow => {
  const record = asRecord(row);
  return {
    display_no: typeof record?.display_no === "string" ? record.display_no : null,
    object_type_code: typeof record?.object_type_code === "string" ? record.object_type_code : null,
    level_code: typeof record?.level_code === "string" ? record.level_code : null,
    system_code: typeof record?.system_code === "string" ? record.system_code : null,
    contractor_org: typeof record?.contractor_org === "string" ? record.contractor_org : null,
    contractor_phone: typeof record?.contractor_phone === "string" ? record.contractor_phone : null,
  };
};

const normalizeSubcontractHeaderRow = (row: unknown): SubcontractHeaderRow => {
  const record = asRecord(row);
  return {
    contractor_org: typeof record?.contractor_org === "string" ? record.contractor_org : null,
    contractor_inn: typeof record?.contractor_inn === "string" ? record.contractor_inn : null,
    contractor_rep: typeof record?.contractor_rep === "string" ? record.contractor_rep : null,
    contractor_phone: typeof record?.contractor_phone === "string" ? record.contractor_phone : null,
    contract_number: typeof record?.contract_number === "string" ? record.contract_number : null,
    contract_date: typeof record?.contract_date === "string" ? record.contract_date : null,
    object_name: typeof record?.object_name === "string" ? record.object_name : null,
    work_type: typeof record?.work_type === "string" ? record.work_type : null,
    work_zone: typeof record?.work_zone === "string" ? record.work_zone : null,
    qty_planned: typeof record?.qty_planned === "number" ? record.qty_planned : null,
    uom: typeof record?.uom === "string" ? record.uom : null,
    price_per_unit: typeof record?.price_per_unit === "number" ? record.price_per_unit : null,
    total_price: typeof record?.total_price === "number" ? record.total_price : null,
    date_start: typeof record?.date_start === "string" ? record.date_start : null,
    date_end: typeof record?.date_end === "string" ? record.date_end : null,
  };
};

const normalizeRequestDisplayRow = (
  row: RequestDisplayRow | null | undefined,
): RequestDisplayRow => ({
  id: row?.id ?? null,
  display_no: row?.display_no ?? null,
  request_no: row?.request_no ?? null,
  status: row?.status ?? null,
});

const normalizeWarehouseIssueHeadRow = (
  row: WarehouseIssueHeadRow | null | undefined,
): WarehouseIssueHeadRow => ({
  id: row?.id ?? null,
  request_id: row?.request_id ?? null,
  base_no: row?.base_no ?? null,
});

const normalizeIssueReqHeadUiRow = (
  row: IssueReqHeadUiRow | null | undefined,
): IssueReqHeadUiRow => ({
  request_id: row?.request_id ?? null,
  submitted_at: row?.submitted_at ?? null,
  issue_status: row?.issue_status ?? null,
  qty_issued_sum: row?.qty_issued_sum ?? null,
});

const normalizeIssueReqItemUiRow = (
  row: IssueReqItemUiRow | null | undefined,
): IssueReqItemUiRow => ({
  request_item_id: row?.request_item_id ?? null,
  rik_code: row?.rik_code ?? null,
  request_id: row?.request_id ?? null,
  name_human: row?.name_human ?? null,
  uom: row?.uom ?? null,
  qty_issued: row?.qty_issued ?? null,
  price: row?.price ?? null,
});

const normalizeWorkProgressLogMaterialRow = (
  row: WorkProgressLogMaterialRow | null | undefined,
): WorkProgressLogMaterialRow => ({
  mat_code: row?.mat_code ?? null,
  uom_mat: row?.uom_mat ?? null,
  qty_fact: row?.qty_fact ?? null,
});

const normalizeCatalogItemRow = (row: CatalogItemRow | null | undefined): CatalogItemRow => ({
  rik_code: row?.rik_code ?? null,
  name_human_ru: row?.name_human_ru ?? null,
  name_human: row?.name_human ?? null,
  uom_code: row?.uom_code ?? null,
});

const normalizeWorkDefaultMaterialRow = (
  row: WorkDefaultMaterialRow | null | undefined,
): WorkDefaultMaterialRow => ({
  mat_code: row?.mat_code ?? null,
  uom: row?.uom ?? null,
});

const normalizeWorkStageRow = (row: WorkStageRow | null | undefined): WorkStageRow => ({
  code: row?.code ?? null,
  name: row?.name ?? null,
});

const buildCatalogMetaMap = (
  rows: CatalogItemRow[] | null | undefined,
): Record<string, CatalogMeta> => {
  const namesMap: Record<string, CatalogMeta> = {};
  for (const rawRow of asArray(rows)) {
    const row = normalizeCatalogItemRow(rawRow);
    const code = String(row.rik_code || "").trim();
    if (!code) continue;
    namesMap[code] = {
      name: row.name_human_ru || row.name_human || code,
      uom: row.uom_code ?? null,
    };
  }
  return namesMap;
};

type ContractorJobHeader = {
  contractor_org: string | null;
  contractor_inn: string | null;
  contractor_rep: string | null;
  contractor_phone: string | null;
  contract_number: string | null;
  contract_date: string | null;
  object_name: string | null;
  work_type?: string | null;
  zone: string | null;
  level_name: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  unit_price: number | null;
  total_price?: number | null;
  date_start: string | null;
  date_end: string | null;
};

type LoadHeaderParams = {
  supabaseClient: SupabaseClient<Database>;
  row: WorkRowLike;
  resolveContractorJobId: (row: WorkRowLike) => Promise<string>;
  resolveRequestId: (row: WorkRowLike) => Promise<string>;
  normText: (value: unknown) => string;
};

export async function loadContractorJobHeaderData(
  params: LoadHeaderParams
): Promise<{ header: ContractorJobHeader | null; objectNameOverride: string | null }> {
  const {
    supabaseClient,
    row,
    resolveContractorJobId,
    resolveRequestId,
    normText,
  } = params;

  const jobId = await resolveContractorJobId(row);
  if (!jobId || !looksLikeUuid(String(jobId))) {
    const reqId = await resolveRequestId(row);
    if (!reqId || !looksLikeUuid(String(reqId))) return { header: null, objectNameOverride: null };
    const req = await supabaseClient
      .from("requests")
      .select("display_no, object_type_code, level_code, system_code, contractor_org, contractor_phone")
      .eq("id", reqId)
      .maybeSingle();
    if (req.error || !req.data) return { header: null, objectNameOverride: null };

    const r = normalizeRequestHeaderRow(req.data);
    const reqObject = [r.object_type_code, r.level_code, r.system_code]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" / ");
    const header: ContractorJobHeader = {
      contractor_org: String(r.contractor_org || "").trim() || null,
      contractor_inn: null,
      contractor_rep: null,
      contractor_phone: normText(r.contractor_phone || "").trim() || null,
      contract_number: String(r.display_no || "").trim() || null,
      contract_date: null,
      object_name: normText(reqObject) || null,
      work_type: normText(row.work_name || row.work_code) || null,
      zone: String(r.level_code || "").trim() || null,
      level_name: String(r.level_code || "").trim() || null,
      qty_planned: Number(row.qty_planned || 0),
      uom: row.uom_id || null,
      unit_price: null,
      total_price: null,
      date_start: null,
      date_end: null,
    };
    return {
      header,
      objectNameOverride: String(reqObject || "").trim() || null,
    };
  }

  const sq = await supabaseClient
    .from("subcontracts")
    .select(WORK_MODAL_SUBCONTRACT_SELECT)
    .eq("id", String(jobId))
    .maybeSingle();
  if (sq.error || !sq.data) return { header: null, objectNameOverride: null };

  const s = normalizeSubcontractHeaderRow(sq.data);
  const header: ContractorJobHeader = {
    contractor_org: normText(s.contractor_org) || null,
    contractor_inn: normText(s.contractor_inn) || null,
    contractor_rep: normText(s.contractor_rep) || null,
    contractor_phone: normText(s.contractor_phone) || null,
    contract_number: normText(s.contract_number) || null,
    contract_date: normText(s.contract_date) || null,
    object_name: normText(s.object_name) || null,
    work_type: normText(s.work_type) || null,
    zone: normText(s.work_zone) || null,
    level_name: null,
    qty_planned: s.qty_planned == null ? null : Number(s.qty_planned),
    uom: normText(s.uom) || null,
    unit_price: s.price_per_unit == null ? null : Number(s.price_per_unit),
    total_price: s.total_price == null ? null : Number(s.total_price),
    date_start: normText(s.date_start) || null,
    date_end: normText(s.date_end) || null,
  };
  return {
    header,
    objectNameOverride: String(header.object_name || "").trim() || null,
  };
}

type LoadIssuedParams = {
  supabaseClient: SupabaseClient<Database>;
  row: WorkRowLike;
  allRows: WorkRowLike[];
  resolveContractorJobId: (row: WorkRowLike) => Promise<string>;
  resolveRequestId: (row: WorkRowLike) => Promise<string>;
  isRejectedOrCancelledRequestStatus: (status: string | null | undefined) => boolean;
  toLocalDateKey: (value: string | Date | null | undefined) => string;
  normText: (value: unknown) => string;
};

export async function loadIssuedTodayData(
  params: LoadIssuedParams
): Promise<{ issuedItems: IssuedItemRow[]; linkedReqCards: LinkedReqCard[]; issuedHint: string }> {
  const {
    supabaseClient,
    row,
    allRows,
    resolveContractorJobId,
    resolveRequestId,
    isRejectedOrCancelledRequestStatus,
    toLocalDateKey,
    normText,
  } = params;

  const jobId = await resolveContractorJobId(row);
  const reqIdForRow = await resolveRequestId(row);
  const reqRows = await fetchRequestScopeRows(supabaseClient, jobId, reqIdForRow);
  const requestIds = reqRows
    .filter((r) => !isRejectedOrCancelledRequestStatus(r.status))
    .map((r) => r.id)
    .filter((v) => !!v && looksLikeUuid(String(v)));
  if (!requestIds.length) {
    return {
      issuedItems: [],
      linkedReqCards: [],
      issuedHint: "Нет утвержденных заявок для подтягивания материалов.",
    };
  }

  if (requestsHasRequestNoInWorkModalCache == null) {
    try {
      const probe = await supabaseClient.from("requests").select("id, request_no").limit(1);
      if (probe.error) throw probe.error;
      const first = asArray(probe.data as RequestNoProbeRow[])[0];
      requestsHasRequestNoInWorkModalCache = !!first && "request_no" in first;
    } catch (error) {
      recordContractorWorkModalFallback("request_no_probe_failed", error, {
        action: "loadIssuedTodayData",
        fallbackAction: "request_no_disabled",
        progressId: String(row.progress_id || "").trim() || null,
      });
      requestsHasRequestNoInWorkModalCache = false;
    }
  }

  const reqDisplaySelect = requestsHasRequestNoInWorkModalCache
    ? "id, display_no, request_no, status"
    : "id, display_no, status";
  const reqDisplayQ = await supabaseClient
    .from("requests")
    .select(reqDisplaySelect)
    .in("id", requestIds);
  const reqDisplayById = new Map<string, { req_no: string; status: string | null }>();
  if (!reqDisplayQ.error && Array.isArray(reqDisplayQ.data)) {
    for (const rawRowReq of asArray(reqDisplayQ.data as RequestDisplayRow[])) {
      const rowReq = normalizeRequestDisplayRow(rawRowReq);
      const rid = String(rowReq.id || "").trim();
      if (!rid) continue;
      const reqNo = String(rowReq.request_no || rowReq.display_no || `REQ-${rid.slice(0, 8)}`).trim();
      const status = String(rowReq.status || "").trim() || null;
      reqDisplayById.set(rid, { req_no: reqNo, status });
    }
  }

  const issueHeadsQ = await supabaseClient
    .from("warehouse_issues")
    .select("id, request_id, base_no")
    .in("request_id", requestIds);
  const issueNosByReq = new Map<string, string[]>();
  if (!issueHeadsQ.error && Array.isArray(issueHeadsQ.data)) {
    for (const rawIssue of asArray(issueHeadsQ.data as WarehouseIssueHeadRow[])) {
      const issue = normalizeWarehouseIssueHeadRow(rawIssue);
      const rid = String(issue.request_id || "").trim();
      if (!rid) continue;
      const issueNo = String(issue.base_no || "").trim() || `ISSUE-${String(issue.id || "").slice(0, 8)}`;
      const list = issueNosByReq.get(rid) || [];
      if (!list.includes(issueNo)) list.push(issueNo);
      issueNosByReq.set(rid, list);
    }
  }

  const headsQ = await supabaseClient
    .from("v_wh_issue_req_heads_ui")
    .select("request_id, submitted_at, issue_status, qty_issued_sum")
    .in("request_id", requestIds);
  const issueStatusByReq = new Map<string, string>();
  const issuedSumByReq = new Map<string, number>();
  const buildReqCards = (issuedByItems?: Map<string, number>): LinkedReqCard[] =>
    requestIds.map((rid) => {
      const meta = reqDisplayById.get(rid);
      const fallbackIssued =
        Number(issuedByItems?.get(rid) || 0) > 0 || Number(issuedSumByReq.get(rid) || 0) > 0;
      const issueNos = issueNosByReq.get(rid) || (fallbackIssued ? ["Выдано"] : []);
      return {
        request_id: rid,
        req_no: meta?.req_no || `REQ-${rid.slice(0, 8)}`,
        status: issueStatusByReq.get(rid) || meta?.status || null,
        issue_nos: issueNos,
      };
    });

  const todayKey = toLocalDateKey(new Date());
  const todayReqIds = new Set<string>();
  if (!headsQ.error && Array.isArray(headsQ.data)) {
    for (const rawHead of asArray(headsQ.data as IssueReqHeadUiRow[])) {
      const h = normalizeIssueReqHeadUiRow(rawHead);
      const rid = String(h.request_id || "").trim();
      if (!rid) continue;
      const issueStatus = String(h.issue_status || "").trim();
      if (issueStatus) issueStatusByReq.set(rid, issueStatus);
      const issuedSum = Number(h.qty_issued_sum ?? 0);
      if (Number.isFinite(issuedSum)) issuedSumByReq.set(rid, issuedSum);
      if (!h.submitted_at || toLocalDateKey(h.submitted_at) === todayKey) {
        todayReqIds.add(rid);
      }
    }
  }

  let scopeIds = Array.from(todayReqIds);
  if (!scopeIds.length) scopeIds = requestIds;
  if (!scopeIds.length) {
    const hasWaiting = reqRows.some((r) => {
      const st = String(r.status || "").toLowerCase();
      return st.includes("waiting") || st.includes("ожидан") || st.includes("в ожидании");
    });
    return {
      issuedItems: [],
      linkedReqCards: buildReqCards(),
      issuedHint: hasWaiting
        ? "Часть заявок еще в ожидании, поэтому выдачи могут отображаться не полностью."
        : "",
    };
  }

  const itemsQ = await supabaseClient
    .from("v_wh_issue_req_items_ui")
    .select("*")
    .in("request_id", scopeIds);
  if (itemsQ.error || !Array.isArray(itemsQ.data)) {
    return { issuedItems: [], linkedReqCards: buildReqCards(), issuedHint: "" };
  }

  const progressIdsForSubcontract = getProgressIdsForSubcontract(allRows, jobId, row);
  const consumedByCode = await loadConsumedByCode(supabaseClient, progressIdsForSubcontract, { positiveOnly: true });

  const mapped: IssuedItemRow[] = asArray(itemsQ.data as IssueReqItemUiRow[])
    .map((rawRow, idx: number) => {
      const r = normalizeIssueReqItemUiRow(rawRow);
      const code = String(r.rik_code || r.request_item_id || `${r.request_id || ""}-${idx}`);
      const issuedQty = Number(r.qty_issued ?? 0);
      const consumed = Number(consumedByCode.get(code) || 0);
      const leftAdjusted = Math.max(0, issuedQty - consumed);
      return {
        issue_item_id: String(r.request_item_id || `${r.request_id || ""}-${idx}`),
        mat_code: code,
        request_id: String(r.request_id || ""),
        title: normText(r.name_human || r.rik_code || "Материал"),
        unit: normText(r.uom) || null,
        qty: issuedQty,
        qty_used: consumed,
        qty_left: leftAdjusted,
        price: r.price ? Number(r.price) : null,
        sum: null,
        qty_fact: issuedQty,
      };
    })
    .filter((x) => Number(x.qty || 0) > 0 || Number(x.qty_left || 0) > 0 || Number(x.qty_used || 0) > 0)
    .sort((a, b) => Number(b.qty || 0) - Number(a.qty || 0));

  const issuedByItems = new Map<string, number>();
  for (const rowItem of mapped) {
    const rid = String(rowItem.request_id || "").trim();
    if (!rid) continue;
    issuedByItems.set(rid, Number(issuedByItems.get(rid) || 0) + Number(rowItem.qty || 0));
  }

  return {
    issuedItems: mapped,
    linkedReqCards: buildReqCards(issuedByItems),
    issuedHint: "",
  };
}

type LoadInitialMaterialsParams = {
  supabaseClient: SupabaseClient<Database>;
  row: WorkRowLike;
};

export async function loadInitialWorkMaterialsForModal(
  params: LoadInitialMaterialsParams
): Promise<WorkMaterialRow[]> {
  const { supabaseClient, row } = params;
  let lastLogQ: { data: WorkProgressLogRow | null; error: unknown } = { data: null, error: null };

  if (looksLikeUuid(String(row.progress_id || ""))) {
    lastLogQ = await supabaseClient
      .from("work_progress_log")
      .select("id, qty, work_uom, stage_note, note")
      .eq("progress_id", row.progress_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastLogQ.error) {
      lastLogQ = await supabaseClient
        .from("work_progress_log")
        .select("id, qty, work_uom, stage_note, note")
        .eq("id", row.progress_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    }
  }

  if (!lastLogQ.error && lastLogQ.data?.id) {
    const logId = String(lastLogQ.data.id);
    const matsQ = await loadPagedRowsWithCeiling<WorkProgressLogMaterialRow>(
      () =>
        supabaseClient
          .from("work_progress_log_materials")
          .select("mat_code, uom_mat, qty_fact")
          .eq("log_id", logId)
          .order("mat_code", { ascending: true }) as unknown as PagedQuery<WorkProgressLogMaterialRow>,
      WORK_MODAL_REFERENCE_PAGE_DEFAULTS,
    );

    if (!matsQ.error && Array.isArray(matsQ.data) && matsQ.data.length) {
      const matsRows = asArray(matsQ.data as WorkProgressLogMaterialRow[]).map(
        normalizeWorkProgressLogMaterialRow,
      );
      const codes = matsRows
        .map((m) => m.mat_code)
        .filter((code): code is string => typeof code === "string" && code.trim().length > 0);
      let namesMap: Record<string, CatalogMeta> = {};

      if (codes.length) {
        const ci = await loadPagedRowsWithCeiling<CatalogItemRow>(
          () =>
            supabaseClient
              .from("catalog_items")
              .select("rik_code, name_human_ru, name_human, uom_code")
              .in("rik_code", codes)
              .order("rik_code", { ascending: true }) as unknown as PagedQuery<CatalogItemRow>,
          WORK_MODAL_REFERENCE_PAGE_DEFAULTS,
        );
        if (!ci.error && Array.isArray(ci.data)) {
          namesMap = buildCatalogMetaMap(ci.data as CatalogItemRow[]);
        }
      }

      const restoredMaterials: WorkMaterialRow[] = matsRows.map((m) => {
        const code = String(m.mat_code);
        const meta = namesMap[code];
        return {
          material_id: null,
          qty: Number(m.qty_fact ?? 0),
          mat_code: code,
          name: meta?.name || code,
          uom: meta?.uom || m.uom_mat || row.uom_id || "",
          available: 0,
          qty_fact: Number(m.qty_fact ?? 0),
        };
      });
      if (restoredMaterials.length) return restoredMaterials;
    }
  }

  const workCode = String(row.work_code || "").trim();
  if (!workCode) return [];

  let defaults: WorkDefaultMaterialRow[] = [];
  const q1 = await supabaseClient
    .from("work_default_materials")
    .select(WORK_DEFAULT_MATERIALS_SELECT)
    .eq("work_code", workCode)
    .limit(100);
  if (!q1.error && Array.isArray(q1.data) && q1.data.length) {
    defaults = asArray(q1.data as WorkDefaultMaterialRow[]).map(normalizeWorkDefaultMaterialRow);
  } else {
    const seed = await supabaseClient.rpc("work_seed_defaults_auto", { p_work_code: workCode });
    if (!seed.error) {
      const q2 = await supabaseClient
        .from("work_default_materials")
        .select(WORK_DEFAULT_MATERIALS_SELECT)
        .eq("work_code", workCode)
        .limit(100);
      if (!q2.error && Array.isArray(q2.data)) {
        defaults = asArray(q2.data as WorkDefaultMaterialRow[]).map(normalizeWorkDefaultMaterialRow);
      }
    } else {
      if (__DEV__) console.warn("[work_seed_defaults_auto] error:", seed.error.message);
    }
  }

  if (!defaults.length) return [];
  const codes = defaults
    .map((d) => d.mat_code)
    .filter((code): code is string => typeof code === "string" && code.trim().length > 0);
  let namesMap: Record<string, CatalogMeta> = {};
  if (codes.length) {
    const ci = await loadPagedRowsWithCeiling<CatalogItemRow>(
      () =>
        supabaseClient
          .from("catalog_items")
          .select("rik_code, name_human_ru, name_human, uom_code")
          .in("rik_code", codes)
          .order("rik_code", { ascending: true }) as unknown as PagedQuery<CatalogItemRow>,
      WORK_MODAL_REFERENCE_PAGE_DEFAULTS,
    );
    if (!ci.error && Array.isArray(ci.data)) {
      namesMap = buildCatalogMetaMap(ci.data as CatalogItemRow[]);
    }
  }

  return defaults.map((d) => {
    const code = String(d.mat_code);
    const meta = namesMap[code];
    return {
      material_id: null,
      qty: 0,
      mat_code: code,
      name: meta?.name || code,
      uom: meta?.uom || String(d.uom || row.uom_id || ""),
      available: 0,
      qty_fact: 0,
    } satisfies WorkMaterialRow;
  });
}

export async function loadWorkStageOptions(params: {
  supabaseClient: SupabaseClient<Database>;
}): Promise<{ code: string; name: string }[]> {
  const { supabaseClient } = params;
  const { data, error } = await loadPagedRowsWithCeiling<WorkStageRow>(
    () =>
      supabaseClient
        .from("work_stages")
        .select("code, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("code", { ascending: true }) as unknown as PagedQuery<WorkStageRow>,
    WORK_MODAL_REFERENCE_PAGE_DEFAULTS,
  );
  if (error || !Array.isArray(data)) return [];
  return asArray(data as WorkStageRow[]).map((rawStage) => {
    const s = normalizeWorkStageRow(rawStage);
    return {
      code: String(s.code),
      name: String(s.name),
    };
  });
}
