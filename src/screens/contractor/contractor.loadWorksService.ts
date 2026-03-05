type WorkRowLike = {
  progress_id: string;
  purchase_item_id?: string | null;
  work_code?: string | null;
  work_name?: string | null;
  object_name?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  request_id?: string | null;
  request_status?: string | null;
  contractor_job_id?: string | null;
  uom_id?: string | null;
  qty_planned?: number;
  qty_done?: number;
  qty_left?: number;
  unit_price?: number | null;
  work_status?: string;
  contractor_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export function mapWorksFactRows(rows: any[], normText: (v: any) => string): WorkRowLike[] {
  return (rows ?? []).map((x: any) => ({
    progress_id: x.progress_id,
    purchase_item_id: x.purchase_item_id ?? null,
    work_code: normText(x.work_code) || null,
    work_name: normText(x.work_name) || null,
    object_name: normText(x.object_name) || null,
    contractor_org: normText(x.contractor_org ?? x.subcontractor_org) || null,
    contractor_inn: normText(x.contractor_inn ?? x.subcontractor_inn) || null,
    contractor_phone: normText(x.contractor_phone ?? x.subcontractor_phone) || null,
    request_id: x.request_id ?? x.req_id ?? null,
    request_status: normText(x.request_status ?? x.status) || null,
    contractor_job_id: x.contractor_job_id ?? x.subcontract_id ?? null,
    uom_id: x.uom_id,
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
    contractor_id: x.contractor_id,
    started_at: x.started_at ?? null,
    finished_at: x.finished_at ?? null,
  }));
}

export async function enrichWorksRows(params: {
  supabaseClient: any;
  mappedBase: WorkRowLike[];
  looksLikeUuid: (v: string) => boolean;
  pickWorkProgressRow: (row: any) => string;
}): Promise<{ rows: WorkRowLike[]; objByJob: Map<string, string> }> {
  const { supabaseClient, mappedBase, looksLikeUuid, pickWorkProgressRow } = params;

  const wpIds = mappedBase
    .filter((r) => {
      const id = String(r.progress_id || "").trim();
      if (!looksLikeUuid(id)) return false;
      return !r.request_id || !r.contractor_job_id || !r.object_name;
    })
    .map((r) => String(r.progress_id || "").trim());

  const wpById = new Map<string, any>();
  if (wpIds.length) {
    const wpByIdRes = await supabaseClient
      .from("work_progress" as any)
      .select("id, request_id, req_id, contractor_job_id, subcontract_id, object_name")
      .in("id", wpIds);
    if (!wpByIdRes.error && Array.isArray(wpByIdRes.data)) {
      for (const row of wpByIdRes.data as any[]) {
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
      .from("purchase_items" as any)
      .select("id, request_item_id")
      .in("id", piIds);
    if (!piQ.error && Array.isArray(piQ.data)) {
      const reqItemIds = Array.from(
        new Set((piQ.data as any[]).map((x: any) => String(x.request_item_id || "").trim()).filter(Boolean))
      );
      const reqByReqItem = new Map<string, string>();
      if (reqItemIds.length) {
        const riQ = await supabaseClient
          .from("request_items" as any)
          .select("id, request_id")
          .in("id", reqItemIds);
        if (!riQ.error && Array.isArray(riQ.data)) {
          for (const ri of riQ.data as any[]) {
            const riId = String(ri.id || "").trim();
            const reqId = String(ri.request_id || "").trim();
            if (riId && reqId) reqByReqItem.set(riId, reqId);
          }
        }
      }
      for (const pi of piQ.data as any[]) {
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
  const reqById = new Map<string, any>();
  if (reqIds.length) {
    let rq = await supabaseClient
      .from("requests" as any)
      .select("id, status, subcontract_id, object_type_code, level_code, system_code")
      .in("id", reqIds);
    if (rq.error) {
      rq = await supabaseClient
        .from("requests" as any)
        .select("id, status, object_type_code, level_code, system_code")
        .in("id", reqIds);
    }
    if (!rq.error && Array.isArray(rq.data)) {
      for (const r of rq.data as any[]) {
        const id = String(r.id || "").trim();
        if (id) reqById.set(id, r);
      }
    }
  }

  const mappedByReq = mappedByPurchase.map((r) => {
    const req = reqById.get(String(r.request_id || "").trim());
    if (!req) return r;
    const reqObject = [req.object_type_code, req.level_code, req.system_code]
      .map((v: any) => String(v || "").trim())
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
      .from("subcontracts" as any)
      .select("id, object_name")
      .in("id", jobIds);
    if (!sq.error && Array.isArray(sq.data)) {
      for (const s of sq.data as any[]) {
        const id = String(s.id || "").trim();
        const obj = String(s.object_name || "").trim();
        if (id && obj) objByJob.set(id, obj);
      }
    }
  }

  return { rows: mappedByReq, objByJob };
}
