import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import type { ActBuilderItem, ActBuilderWorkItem, IssuedItemRow } from "./types";

type WorkRowForBuilder = {
  contractor_job_id?: string | null;
  request_id?: string | null;
  progress_id?: string | null;
  work_name?: string | null;
  work_code?: string | null;
  qty_planned?: number | null;
  uom_id?: string | null;
  unit_price?: number | null;
};

type JobHeaderForBuilder = {
  work_type?: string | null;
  unit_price?: number | null;
};

export function buildActBuilderMaterialItems(
  issuedItems: IssuedItemRow[],
  ensuredWorkMaterials: WorkMaterialRow[]
): ActBuilderItem[] {
  const seeded = issuedItems.map((it) => {
    const issued = Number(it.qty || 0);
    const used = Number(it.qty_used || 0);
    const left = Math.max(0, issued - used);
    return {
      id: String(it.issue_item_id),
      mat_code: String(it.mat_code || it.issue_item_id || it.title),
      name: String(it.title || "Материал"),
      uom: String(it.unit || ""),
      issuedQty: issued,
      alreadyUsed: used,
      qtyMax: left,
      qty: left,
      price: it.price == null ? null : Number(it.price),
      include: false,
      source: issued > 0 ? "issued" : "ready",
    } as ActBuilderItem;
  });

  const byCode = new Set(seeded.map((s) => s.mat_code));
  const fallback = ensuredWorkMaterials
    .filter((m: any) => !byCode.has(String(m.mat_code || "")))
    .map((m: any, idx: number) => {
      const issued = Number(m.qty_fact || 0);
      return {
        id: `fallback-${idx}-${String(m.mat_code || m.name || "mat")}`,
        mat_code: String(m.mat_code || m.name || `MAT-${idx}`),
        name: String(m.name || m.mat_code || "Материал"),
        uom: String(m.uom || ""),
        issuedQty: issued,
        alreadyUsed: 0,
        qtyMax: issued,
        qty: issued,
        price: null,
        include: false,
        source: "issued" as const,
      } as ActBuilderItem;
    });

  return [...seeded, ...fallback].filter(
    (m) =>
      Number(m.issuedQty || 0) > 0 ||
      Number(m.qtyMax || 0) > 0 ||
      Number(m.alreadyUsed || 0) > 0
  );
}

export function resolveActBuilderRowsScope(
  rows: WorkRowForBuilder[],
  currentRow: WorkRowForBuilder | null | undefined
): WorkRowForBuilder[] {
  const currentJobId = String(currentRow?.contractor_job_id || "").trim();
  const currentReqId = String(currentRow?.request_id || "").trim();
  const currentProgressId = String(currentRow?.progress_id || "").trim();
  if (currentJobId) {
    return rows.filter((r) => String(r.contractor_job_id || "").trim() === currentJobId);
  }
  if (currentReqId) {
    return rows.filter((r) => String(r.request_id || "").trim() === currentReqId);
  }
  return rows.filter((r) => String(r.progress_id || "").trim() === currentProgressId);
}

export function buildActBuilderWorkItems(
  rowsForJob: WorkRowForBuilder[],
  toHumanWork: (value: string | null) => string,
  inferUnitByWorkName: (workName: string) => string | null,
  jobHeader?: JobHeaderForBuilder | null
): ActBuilderWorkItem[] {
  const normKey = (v: string) =>
    String(v || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const workMetaByName = new Map<string, { unit: string; approvedQty: number | null; approvedPrice: number | null }>();
  for (const r of rowsForJob) {
    const name = toHumanWork(r.work_name || r.work_code || null);
    if (!name) continue;
    const key = normKey(name);
    const plannedQty = Number(r.qty_planned ?? 0);
    const rowPrice = r.unit_price == null ? null : Number(r.unit_price);
    const prev = workMetaByName.get(key);
    if (!prev) {
      workMetaByName.set(key, {
        unit: String(r.uom_id || "").trim() || inferUnitByWorkName(name) || "",
        approvedQty: Number.isFinite(plannedQty) && plannedQty > 0 ? plannedQty : null,
        approvedPrice: Number.isFinite(Number(rowPrice)) ? Number(rowPrice) : null,
      });
      continue;
    }
    const nextQty =
      Number.isFinite(plannedQty) && plannedQty > 0
        ? Math.max(Number(prev.approvedQty || 0), plannedQty)
        : prev.approvedQty;
    const nextPrice = prev.approvedPrice ?? (Number.isFinite(Number(rowPrice)) ? Number(rowPrice) : null);
    workMetaByName.set(key, {
      unit: prev.unit || String(r.uom_id || "").trim() || inferUnitByWorkName(name) || "",
      approvedQty: nextQty || null,
      approvedPrice: nextPrice,
    });
  }

  const worksPool = Array.from(
    new Set(rowsForJob.map((r) => toHumanWork(r.work_name || r.work_code || null)).filter(Boolean))
  );

  return worksPool.map((name, idx) => {
    const key = normKey(name);
    const meta = workMetaByName.get(key);
    const approvedPrice =
      meta?.approvedPrice ??
      (normKey(name) === normKey(jobHeader?.work_type || "") && jobHeader?.unit_price != null
        ? Number(jobHeader.unit_price)
        : null);
    const approvedUnit = meta?.unit || inferUnitByWorkName(name) || "";
    return {
      id: `w-${idx}-${name}`,
      name,
      qty: 0,
      unit: approvedUnit,
      price: approvedPrice,
      approvedQty: meta?.approvedQty ?? null,
      approvedUnit: approvedUnit || null,
      approvedPrice: approvedPrice,
      comment: "",
      include: false,
    } as ActBuilderWorkItem;
  });
}
