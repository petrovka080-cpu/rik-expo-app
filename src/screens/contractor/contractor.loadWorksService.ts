import {
  attachSubcontractAndObject,
  buildSubcontractLookups,
  buildSyntheticSubcontractRows,
  filterVisibleRows,
  selectScopedApprovedSubcontracts,
} from "./contractor.rows";

export type ContractorWorkRow = {
  progress_id: string;
  created_at?: string | null;
  purchase_item_id?: string | null;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  request_id?: string | null;
  request_status?: string | null;
  contractor_job_id?: string | null;
  uom_id: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
  unit_price?: number | null;
  work_status: string;
  contractor_id: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type WorkProgressRawRow = {
  id?: string | null;
  progress_id?: string | null;
  request_id?: string | null;
  req_id?: string | null;
  contractor_job_id?: string | null;
  subcontract_id?: string | null;
  object_name?: string | null;
};

type PurchaseItemRawRow = {
  id?: string | null;
  request_item_id?: string | null;
};

type RequestItemRawRow = {
  id?: string | null;
  request_id?: string | null;
};

type RequestRawRow = {
  id?: string | null;
  status?: string | null;
  subcontract_id?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
};

type SubcontractObjectRawRow = {
  id?: string | null;
  object_name?: string | null;
};

type SubcontractLiteLike = {
  id: string;
  status?: string | null;
  object_name?: string | null;
  work_type?: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  created_at?: string | null;
};

export type ContractorSubcontractCard = SubcontractLiteLike;

export function mapWorksFactRows(
  rows: Record<string, unknown>[],
  normText: (v: unknown) => string
): ContractorWorkRow[] {
  return (rows ?? []).map((x) => ({
    progress_id: String(x.progress_id || "").trim(),
    created_at: x.created_at == null ? null : String(x.created_at),
    purchase_item_id: x.purchase_item_id == null ? null : String(x.purchase_item_id),
    work_code: String(x.work_code || "").trim() || null,
    work_name: normText(x.work_name) || null,
    object_name: normText(x.object_name) || null,
    contractor_org: normText(x.contractor_org ?? x.subcontractor_org) || null,
    contractor_inn: normText(x.contractor_inn ?? x.subcontractor_inn) || null,
    contractor_phone: normText(x.contractor_phone ?? x.subcontractor_phone) || null,
    request_id: x.request_id == null ? (x.req_id == null ? null : String(x.req_id)) : String(x.request_id),
    request_status: normText(x.request_status ?? x.status) || null,
    contractor_job_id:
      x.contractor_job_id == null
        ? x.subcontract_id == null
          ? null
          : String(x.subcontract_id)
        : String(x.contractor_job_id),
    uom_id: x.uom_id == null ? null : String(x.uom_id),
    qty_planned: Number(x.qty_planned ?? 0),
    qty_done: Number(x.qty_done ?? 0),
    qty_left: Number(x.qty_left ?? 0),
    unit_price:
      x.unit_price == null
        ? x.price_per_unit == null
          ? null
          : Number(x.price_per_unit)
        : Number(x.unit_price),
    work_status: normText(x.work_status) || "",
    contractor_id: x.contractor_id == null ? null : String(x.contractor_id),
    started_at: x.started_at == null ? null : String(x.started_at),
    finished_at: x.finished_at == null ? null : String(x.finished_at),
  }));
}

export async function enrichWorksRows(params: {
  supabaseClient: any;
  mappedBase: ContractorWorkRow[];
  looksLikeUuid: (v: string) => boolean;
  pickWorkProgressRow: (row: WorkProgressRawRow) => string;
}): Promise<{ rows: ContractorWorkRow[]; objByJob: Map<string, string> }> {
  const { supabaseClient, mappedBase, looksLikeUuid, pickWorkProgressRow } = params;

  const wpIds = mappedBase
    .filter((r) => {
      const id = String(r.progress_id || "").trim();
      if (!looksLikeUuid(id)) return false;
      return !r.request_id || !r.contractor_job_id || !r.object_name;
    })
    .map((r) => String(r.progress_id || "").trim());

  const wpById = new Map<string, WorkProgressRawRow>();
  if (wpIds.length) {
    const wpByIdRes = await supabaseClient
      .from("work_progress")
      .select("id, request_id, req_id, contractor_job_id, subcontract_id, object_name")
      .in("id", wpIds);
    if (!wpByIdRes.error && Array.isArray(wpByIdRes.data)) {
      for (const row of wpByIdRes.data as WorkProgressRawRow[]) {
        const id = pickWorkProgressRow(row);
        if (id) wpById.set(id, row);
      }
    }
  }

  const mapped = mappedBase.map((r) => {
    const wp = wpById.get(String(r.progress_id));
    if (!wp) return r;
    return {
      ...r,
      request_id: r.request_id || wp.request_id || wp.req_id || null,
      contractor_job_id: r.contractor_job_id || wp.contractor_job_id || wp.subcontract_id || null,
      object_name: r.object_name || wp.object_name || null,
    };
  });

  const piIds = Array.from(
    new Set(
      mapped
        .filter((r) => !String(r.request_id || "").trim())
        .map((r) => String(r.purchase_item_id || "").trim())
        .filter(Boolean)
    )
  );
  const requestIdByPurchaseItem = new Map<string, string>();
  if (piIds.length) {
    const piQ = await supabaseClient
      .from("purchase_items")
      .select("id, request_item_id")
      .in("id", piIds);
    if (!piQ.error && Array.isArray(piQ.data)) {
      const reqItemIds = Array.from(
        new Set(
          (piQ.data as PurchaseItemRawRow[])
            .map((x) => String(x.request_item_id || "").trim())
            .filter(Boolean)
        )
      );
      const reqByReqItem = new Map<string, string>();
      if (reqItemIds.length) {
        const riQ = await supabaseClient
          .from("request_items")
          .select("id, request_id")
          .in("id", reqItemIds);
        if (!riQ.error && Array.isArray(riQ.data)) {
          for (const ri of riQ.data as RequestItemRawRow[]) {
            const riId = String(ri.id || "").trim();
            const reqId = String(ri.request_id || "").trim();
            if (riId && reqId) reqByReqItem.set(riId, reqId);
          }
        }
      }
      for (const pi of piQ.data as PurchaseItemRawRow[]) {
        const piId = String(pi.id || "").trim();
        const riId = String(pi.request_item_id || "").trim();
        const reqId = reqByReqItem.get(riId) || "";
        if (piId && reqId) requestIdByPurchaseItem.set(piId, reqId);
      }
    }
  }

  const mappedByPurchase = mapped.map((r) => {
    const piId = String(r.purchase_item_id || "").trim();
    return {
      ...r,
      request_id: r.request_id || (piId ? requestIdByPurchaseItem.get(piId) || null : null),
    };
  });

  const reqIds = Array.from(
    new Set(
      mappedByPurchase
        .filter((r) => {
          const rid = String(r.request_id || "").trim();
          if (!rid) return false;
          return !r.request_status || !r.contractor_job_id || !r.object_name;
        })
        .map((r) => String(r.request_id || "").trim())
        .filter(Boolean)
    )
  );
  const reqById = new Map<string, RequestRawRow>();
  if (reqIds.length) {
    let rq = await supabaseClient
      .from("requests")
      .select("id, status, subcontract_id, object_type_code, level_code, system_code")
      .in("id", reqIds);
    if (rq.error) {
      rq = await supabaseClient
        .from("requests")
        .select("id, status, object_type_code, level_code, system_code")
        .in("id", reqIds);
    }
    if (!rq.error && Array.isArray(rq.data)) {
      for (const r of rq.data as RequestRawRow[]) {
        const id = String(r.id || "").trim();
        if (id) reqById.set(id, r);
      }
    }
  }

  const mappedByReq = mappedByPurchase.map((r) => {
    const req = reqById.get(String(r.request_id || "").trim());
    if (!req) return r;
    const reqObject = [req.object_type_code, req.level_code, req.system_code]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" / ");
    return {
      ...r,
      request_status: r.request_status || req.status || null,
      contractor_job_id: r.contractor_job_id || req.subcontract_id || null,
      object_name: r.object_name || reqObject || null,
    };
  });

  const jobIds = Array.from(
    new Set(
      mappedByReq
        .filter((r) => !!String(r.contractor_job_id || "").trim() && !String(r.object_name || "").trim())
        .map((r) => String(r.contractor_job_id || "").trim())
        .filter(Boolean)
    )
  );
  const objByJob = new Map<string, string>();
  if (jobIds.length) {
    const sq = await supabaseClient
      .from("subcontracts")
      .select("id, object_name")
      .in("id", jobIds);
    if (!sq.error && Array.isArray(sq.data)) {
      for (const s of sq.data as SubcontractObjectRawRow[]) {
        const id = String(s.id || "").trim();
        const obj = String(s.object_name || "").trim();
        if (id && obj) objByJob.set(id, obj);
      }
    }
  }

  return { rows: mappedByReq, objByJob };
}

export async function loadContractorWorksBundle(params: {
  supabaseClient: any;
  normText: (v: unknown) => string;
  looksLikeUuid: (v: string) => boolean;
  pickWorkProgressRow: (row: WorkProgressRawRow) => string;
  myContractorId: string;
  isStaff: boolean;
  isExcludedWorkCode: (code: string) => boolean;
  isApprovedForOtherStatus: (status: string | null | undefined) => boolean;
}): Promise<{
  rows: ContractorWorkRow[];
  subcontractCards: ContractorSubcontractCard[];
  debug: { isStaff: boolean; subcontractsFound: number; totalApproved: number };
}> {
  const {
    supabaseClient,
    normText,
    looksLikeUuid,
    pickWorkProgressRow,
    myContractorId,
    isStaff,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  } = params;

  const sqApprovedPromise = supabaseClient
    .from("subcontracts")
    .select("id, status, work_type, object_name, qty_planned, uom, contractor_org, contractor_inn, contractor_phone, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(500);

  const worksRes = await supabaseClient
    .from("v_works_fact")
    .select("*")
    .order("created_at", { ascending: false });
  if (worksRes.error) {
    throw worksRes.error;
  }

  const mappedBase = mapWorksFactRows(
    Array.isArray(worksRes.data) ? (worksRes.data as Record<string, unknown>[]) : [],
    normText
  );
  const enrichResult = await enrichWorksRows({
    supabaseClient,
    mappedBase,
    looksLikeUuid,
    pickWorkProgressRow,
  });

  const sqApproved = await sqApprovedPromise;
  if (sqApproved.error) {
    throw sqApproved.error;
  }

  const allApproved = Array.isArray(sqApproved.data) ? (sqApproved.data as SubcontractLiteLike[]) : [];
  const subcontractCards = selectScopedApprovedSubcontracts({
    allApproved,
  });

  const lookupMaps = buildSubcontractLookups(subcontractCards);
  const mappedWithObject = attachSubcontractAndObject({
    rows: enrichResult.rows,
    objByJob: enrichResult.objByJob,
    lookups: lookupMaps,
  });

  const allowedJobIds = new Set(subcontractCards.map((s) => String(s.id || "").trim()).filter(Boolean));
  const filtered = filterVisibleRows({
    rows: mappedWithObject,
    allowedJobIds,
    myContractorId,
    isStaff,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  });

  const existingJobIds = new Set(filtered.map((r) => String(r.contractor_job_id || "").trim()).filter(Boolean));
  const syntheticRows: ContractorWorkRow[] = buildSyntheticSubcontractRows(
    subcontractCards,
    existingJobIds
  ).map((r) => ({
    progress_id: String(r.progress_id || "").trim(),
    created_at: null,
    purchase_item_id: r.purchase_item_id == null ? null : String(r.purchase_item_id),
    work_code: r.work_code == null ? null : String(r.work_code),
    work_name: r.work_name == null ? null : String(r.work_name),
    object_name: r.object_name == null ? null : String(r.object_name),
    contractor_org: r.contractor_org == null ? null : String(r.contractor_org),
    contractor_inn: r.contractor_inn == null ? null : String(r.contractor_inn),
    contractor_phone: r.contractor_phone == null ? null : String(r.contractor_phone),
    request_id: r.request_id == null ? null : String(r.request_id),
    request_status: null,
    contractor_job_id: r.contractor_job_id == null ? null : String(r.contractor_job_id),
    uom_id: r.uom_id == null ? null : String(r.uom_id),
    qty_planned: Number(r.qty_planned ?? 0),
    qty_done: Number(r.qty_done ?? 0),
    qty_left: Number(r.qty_left ?? 0),
    unit_price: r.unit_price == null ? null : Number(r.unit_price),
    work_status: String(r.work_status || ""),
    contractor_id: r.contractor_id == null ? null : String(r.contractor_id),
    started_at: r.started_at == null ? null : String(r.started_at),
    finished_at: r.finished_at == null ? null : String(r.finished_at),
  }));

  return {
    rows: [...syntheticRows, ...filtered],
    subcontractCards,
    debug: {
      isStaff,
      subcontractsFound: subcontractCards.length,
      totalApproved: allApproved.length,
    },
  };
}
