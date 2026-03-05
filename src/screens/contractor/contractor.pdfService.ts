import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import { generateActPdf } from "./contractorPdf";
import { loadAggregatedWorkSummary } from "./contractor.data";
import type { WorkLogRow } from "./types";

type WorkRowLike = {
  progress_id: string;
  work_name?: string | null;
  work_code?: string | null;
  object_name?: string | null;
  uom_id?: string | null;
  qty_planned?: number | null;
  qty_done?: number | null;
  qty_left?: number | null;
};

type JobHeaderLike = {
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  zone?: string | null;
  level_name?: string | null;
  work_type?: string | null;
  unit_price?: number | null;
  object_name?: string | null;
};

export async function generateSummaryPdfForWork(params: {
  supabaseClient: any;
  workModalRow: WorkRowLike;
  jobHeader: JobHeaderLike | null;
  pickFirstNonEmpty: (...vals: any[]) => string | null;
}): Promise<void> {
  const { supabaseClient, workModalRow, jobHeader, pickFirstNonEmpty } = params;
  const { work, materials } = await loadAggregatedWorkSummary(
    supabaseClient,
    workModalRow.progress_id,
    workModalRow as any
  );
  const resolvedObj = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
  await generateActPdf({
    mode: "summary",
    work: work as any,
    materials: materials as any,
    contractorName: jobHeader?.contractor_org,
    contractorInn: jobHeader?.contractor_inn,
    contractorPhone: jobHeader?.contractor_phone,
    customerName: resolvedObj || (work as any).object_name || "—",
    customerInn: null,
    contractNumber: jobHeader?.contract_number,
    contractDate: jobHeader?.contract_date,
    zoneText: `${jobHeader?.zone || "—"} / ${jobHeader?.level_name || "—"}`,
    mainWorkName: jobHeader?.work_type || (work as any).work_name || (work as any).work_code,
    actNumber: (work as any).progress_id?.slice?.(0, 8),
  });
}

export async function generateHistoryPdfForLog(params: {
  supabaseClient: any;
  workModalRow: WorkRowLike;
  jobHeader: JobHeaderLike | null;
  log: WorkLogRow;
  parseActMeta: (note: string | null | undefined) => { selectedWorks: string[]; visibleNote: string };
  pickFirstNonEmpty: (...vals: any[]) => string | null;
}): Promise<void> {
  const { supabaseClient, workModalRow, jobHeader, log, parseActMeta, pickFirstNonEmpty } = params;

  const { data: mats } = await supabaseClient
    .from("work_progress_log_materials" as any)
    .select("mat_code, uom_mat, qty_fact")
    .eq("log_id", log.id);

  const codes = (mats || []).map((m: any) => m.mat_code) || [];
  const namesMap: Record<string, { name: string; uom: string | null }> = {};
  if (codes.length) {
    const ci = await supabaseClient
      .from("catalog_items" as any)
      .select("rik_code, name_human_ru, name_human, uom_code")
      .in("rik_code", codes);

    if (!ci.error && Array.isArray(ci.data)) {
      for (const n of ci.data as any[]) {
        namesMap[n.rik_code] = {
          name: n.name_human_ru || n.name_human || n.rik_code,
          uom: n.uom_code,
        };
      }
    }
  }

  const matsRows: WorkMaterialRow[] = (((mats as any[]) || []).map((m: any) => {
    const code = String(m.mat_code);
    const meta = namesMap[code];
    const q = Number(m.qty_fact ?? 0);
    return {
      mat_code: code,
      name: meta?.name || code,
      uom: meta?.uom || m.uom_mat || "",
      available: 0,
      issued_qty: q,
      act_used_qty: q,
      qty_fact: q,
    } as any as WorkMaterialRow;
  }));

  const actWork: WorkRowLike = {
    ...workModalRow,
    qty_done: log.qty,
    qty_left: Math.max(0, Number(workModalRow.qty_planned || 0) - Number(log.qty || 0)),
  };
  const meta = parseActMeta(log.note);
  const selectedWorksForPdf = meta.selectedWorks.map((name) => ({
    name,
    unit: workModalRow?.uom_id || "",
    price: Number(jobHeader?.unit_price || 0),
    qty: 1,
    comment: "",
  }));
  const resolvedObj = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";

  await generateActPdf({
    mode: "normal",
    work: actWork as any,
    materials: matsRows as any,
    actDate: log.created_at,
    selectedWorks: selectedWorksForPdf,
    contractorName: jobHeader?.contractor_org,
    contractorInn: jobHeader?.contractor_inn,
    contractorPhone: jobHeader?.contractor_phone,
    customerName: resolvedObj || actWork.object_name || "—",
    customerInn: null,
    contractNumber: jobHeader?.contract_number,
    contractDate: jobHeader?.contract_date,
    zoneText: `${jobHeader?.zone || "—"} / ${jobHeader?.level_name || "—"}`,
    mainWorkName: jobHeader?.work_type || actWork.work_name || actWork.work_code,
    actNumber: log.id?.slice?.(0, 8),
  });
}
