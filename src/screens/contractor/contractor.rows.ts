type WorkRowLike = {
  progress_id: string;
  work_code?: string | null;
  work_name?: string | null;
  object_name?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  request_status?: string | null;
  request_id?: string | null;
  contractor_job_id?: string | null;
  uom_id?: string | null;
  qty_planned?: number | null;
  qty_done?: number | null;
  qty_left?: number | null;
  contractor_id?: string | null;
  purchase_item_id?: string | null;
  unit_price?: number | null;
  work_status?: string;
  started_at?: string | null;
  finished_at?: string | null;
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
};

type LookupMaps = {
  subcontractByObjWork: Map<string, string>;
  subcontractByWork: Map<string, string | "MULTI">;
};

const normalizeKeyPart = (v: any) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const keyByObjWork = (obj: any, work: any) => `${normalizeKeyPart(obj)}|${normalizeKeyPart(work)}`;

export function buildSubcontractLookups(subcontractsByOrg: SubcontractLiteLike[]): LookupMaps {
  const subcontractByObjWork = new Map<string, string>();
  const subcontractByWork = new Map<string, string | "MULTI">();
  for (const s of subcontractsByOrg) {
    const sid = String(s.id || "").trim();
    if (!sid) continue;
    const obj = String(s.object_name || "").trim();
    const work = String(s.work_type || "").trim();
    if (obj && work) subcontractByObjWork.set(keyByObjWork(obj, work), sid);
    if (work) {
      const wk = normalizeKeyPart(work);
      const prev = subcontractByWork.get(wk);
      if (!prev) subcontractByWork.set(wk, sid);
      else if (prev !== sid) subcontractByWork.set(wk, "MULTI");
    }
  }
  return { subcontractByObjWork, subcontractByWork };
}

export function attachSubcontractAndObject<T extends WorkRowLike>(params: {
  rows: T[];
  objByJob: Map<string, string>;
  lookups: LookupMaps;
}): T[] {
  const { rows, objByJob, lookups } = params;
  return rows.map((r) => {
    let jid = String(r.contractor_job_id || "").trim();
    if (!jid) {
      const k = keyByObjWork(r.object_name, r.work_name || r.work_code);
      jid = lookups.subcontractByObjWork.get(k) || "";
    }
    if (!jid) {
      const wk = normalizeKeyPart(r.work_name || r.work_code);
      const candidate = lookups.subcontractByWork.get(wk);
      if (candidate && candidate !== "MULTI") jid = candidate;
    }
    const fallbackObject = jid ? objByJob.get(jid) || null : null;
    return {
      ...r,
      contractor_job_id: jid || null,
      object_name: r.object_name || fallbackObject,
    };
  });
}

export function filterVisibleRows<T extends WorkRowLike>(params: {
  rows: T[];
  allowedJobIds: Set<string>;
  myContractorId: string;
  isStaff?: boolean;
  isExcludedWorkCode: (code: string) => boolean;
  isApprovedForOtherStatus: (status: string | null | undefined) => boolean;
}): T[] {
  const {
    rows,
    allowedJobIds,
    myContractorId,
    isStaff,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  } = params;

  return rows.filter((r) => {
    const c = String(r.work_code ?? "").toUpperCase();
    const rowContractorId = String(r.contractor_id || "").trim();
    const jid = String(r.contractor_job_id || "").trim();
    const ownedByMe = !!myContractorId && rowContractorId === myContractorId;
    const inMySubcontract = jid && allowedJobIds.has(jid);
    const isOther = !jid;
    const reqStatus = String(r.request_status || "").toLowerCase();
    const approvedForOther = isApprovedForOtherStatus(reqStatus);

    if (
      !isStaff &&
      !ownedByMe &&
      allowedJobIds.size > 0 &&
      !inMySubcontract &&
      !(isOther && approvedForOther)
    ) {
      return false;
    }
    if (!isStaff && !ownedByMe && allowedJobIds.size === 0 && !(isOther && approvedForOther)) {
      return false;
    }
    if (isExcludedWorkCode(c)) return false;
    return true;
  });
}

export function buildSyntheticSubcontractRows(subcontractsByOrg: SubcontractLiteLike[], existingJobIds: Set<string>): WorkRowLike[] {
  return subcontractsByOrg
    .filter((s) => String(s.status || "").toLowerCase() === "approved")
    .filter((s) => {
      const sid = String(s.id || "").trim();
      return !!sid && !existingJobIds.has(sid);
    })
    .map((s) => {
      const sid = String(s.id || "").trim();
      const planned = Number(s.qty_planned ?? 0) || 0;
      return {
        progress_id: `subcontract:${sid}`,
        purchase_item_id: null,
        work_code: "WRK-SUBCONTRACT",
        work_name: String(s.work_type || "Работа").trim() || "Работа",
        object_name: String(s.object_name || "").trim() || null,
        request_id: null,
        contractor_job_id: sid,
        uom_id: String(s.uom || "").trim() || null,
        qty_planned: planned,
        qty_done: 0,
        qty_left: planned,
        work_status: "не назначено",
        contractor_id: null,
        started_at: null,
        finished_at: null,
        contractor_org: String(s.contractor_org || "").trim() || null,
        contractor_inn: String(s.contractor_inn || "").trim() || null,
      };
    });
}

export function selectScopedApprovedSubcontracts(params: {
  allApproved: SubcontractLiteLike[];
}): SubcontractLiteLike[] {
  const { allApproved } = params;
  // Contractor cards must be built from approved subcontracts first.
  return allApproved;
}
