import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import type { Database } from "../../lib/database.types";
import { loadAggregatedWorkSummary } from "./contractor.data";
import { generateActPdf, type ContractorPdfWork } from "./contractorPdf";
import { loadContractorWorkPdfSourceViaRpc } from "./contractorPdfSource.service";
import type { WorkLogRow } from "./types";

export type ContractorPdfWorkRowLike = {
  progress_id: string;
  work_name?: string | null;
  work_code?: string | null;
  object_name?: string | null;
  uom_id?: string | null;
  qty_planned?: number | null;
  qty_done?: number | null;
  qty_left?: number | null;
};

type AggregatedWorkBase = ContractorPdfWorkRowLike & {
  qty_planned: number;
  qty_done: number;
  qty_left: number;
};

export type ContractorPdfJobHeaderLike = {
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

type LogMaterialRow = {
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

type SelectedWorkForPdf = {
  name: string;
  unit: string;
  price: number;
  qty?: number;
  comment?: string;
};

const toPdfWork = (row: ContractorPdfWorkRowLike, objectNameOverride?: string | null): ContractorPdfWork => ({
  progress_id: String(row.progress_id || ""),
  work_code: row.work_code ?? null,
  work_name: row.work_name ?? null,
  object_name: objectNameOverride == null ? row.object_name ?? null : objectNameOverride,
});

const toPdfMaterials = (
  rows: { mat_code: string; name: string; uom: string | null; qty_fact: number }[],
): WorkMaterialRow[] =>
  rows.map(
    (row) =>
      ({
        material_id: null,
        qty: row.qty_fact,
        qty_fact: row.qty_fact,
        mat_code: row.mat_code,
        name: row.name,
        uom: row.uom || "",
        available: 0,
      }) satisfies WorkMaterialRow,
  );

export async function generateSummaryPdfForWork(params: {
  supabaseClient: SupabaseClient<Database>;
  workModalRow: ContractorPdfWorkRowLike;
  jobHeader: ContractorPdfJobHeaderLike | null;
  pickFirstNonEmpty: (...vals: unknown[]) => string | null;
}): Promise<void> {
  const { supabaseClient, workModalRow, jobHeader, pickFirstNonEmpty } = params;

  try {
    const source = await loadContractorWorkPdfSourceViaRpc({
      supabaseClient,
      progressId: String(workModalRow.progress_id || "").trim(),
    });
    const resolvedObj = pickFirstNonEmpty(source.work.object_name, source.header.object_name) || "";
    await generateActPdf({
      mode: "summary",
      work: toPdfWork(source.work, resolvedObj || source.work.object_name || null),
      materials: toPdfMaterials(source.materials),
      contractorName: source.header.contractor_org,
      contractorInn: source.header.contractor_inn,
      contractorPhone: source.header.contractor_phone,
      customerName: resolvedObj || source.work.object_name || "—",
      customerInn: null,
      contractNumber: source.header.contract_number,
      contractDate: source.header.contract_date,
      zoneText: `${source.header.zone || "—"} / ${source.header.level_name || "—"}`,
      mainWorkName: source.header.work_type || source.work.work_name || source.work.work_code,
      actNumber: String(source.work.progress_id || "").slice(0, 8),
    });
    return;
  } catch (error) {
    if (__DEV__) console.warn("[contractor.pdf] summary rpc source fallback", {
      progressId: workModalRow.progress_id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  const baseWork: AggregatedWorkBase = {
    ...workModalRow,
    qty_planned: Number(workModalRow.qty_planned ?? 0),
    qty_done: Number(workModalRow.qty_done ?? 0),
    qty_left: Number(workModalRow.qty_left ?? 0),
  };
  const { work, materials } = await loadAggregatedWorkSummary(
    supabaseClient,
    workModalRow.progress_id,
    baseWork,
  );
  const resolvedObj = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
  const pdfWork = toPdfWork(work, resolvedObj || work.object_name || null);

  await generateActPdf({
    mode: "summary",
    work: pdfWork,
    materials,
    contractorName: jobHeader?.contractor_org,
    contractorInn: jobHeader?.contractor_inn,
    contractorPhone: jobHeader?.contractor_phone,
    customerName: resolvedObj || work.object_name || "—",
    customerInn: null,
    contractNumber: jobHeader?.contract_number,
    contractDate: jobHeader?.contract_date,
    zoneText: `${jobHeader?.zone || "—"} / ${jobHeader?.level_name || "—"}`,
    mainWorkName: jobHeader?.work_type || work.work_name || work.work_code,
    actNumber: String(work.progress_id || "").slice(0, 8),
  });
}

export async function generateHistoryPdfForLog(params: {
  supabaseClient: SupabaseClient<Database>;
  workModalRow: ContractorPdfWorkRowLike;
  jobHeader: ContractorPdfJobHeaderLike | null;
  log: WorkLogRow;
  parseActMeta: (note: string | null | undefined) => { selectedWorks: string[]; visibleNote: string };
  pickFirstNonEmpty: (...vals: unknown[]) => string | null;
}) {
  const { supabaseClient, workModalRow, jobHeader, log, parseActMeta, pickFirstNonEmpty } = params;

  try {
    const source = await loadContractorWorkPdfSourceViaRpc({
      supabaseClient,
      progressId: String(workModalRow.progress_id || "").trim(),
      logId: log.id,
    });
    const meta = parseActMeta(source.log?.note);
    const selectedWorksForPdf: SelectedWorkForPdf[] = meta.selectedWorks.map((name) => ({
      name,
      unit: source.work.uom_id || "",
      price: Number(source.header.unit_price || 0),
      qty: 1,
      comment: "",
    }));
    const resolvedObj = pickFirstNonEmpty(source.work.object_name, source.header.object_name) || "";

    await generateActPdf({
      mode: "normal",
      work: toPdfWork(source.work, resolvedObj || source.work.object_name || null),
      materials: toPdfMaterials(source.materials),
      actDate: source.log?.created_at ?? log.created_at,
      selectedWorks: selectedWorksForPdf,
      contractorName: source.header.contractor_org,
      contractorInn: source.header.contractor_inn,
      contractorPhone: source.header.contractor_phone,
      customerName: resolvedObj || source.work.object_name || "—",
      customerInn: null,
      contractNumber: source.header.contract_number,
      contractDate: source.header.contract_date,
      zoneText: `${source.header.zone || "—"} / ${source.header.level_name || "—"}`,
      mainWorkName: source.header.work_type || source.work.work_name || source.work.work_code,
      actNumber: String(source.log?.id || log.id || "").slice(0, 8),
    });
    return;
  } catch (error) {
    if (__DEV__) console.warn("[contractor.pdf] history rpc source fallback", {
      progressId: workModalRow.progress_id,
      logId: log.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  const { data: mats } = await supabaseClient
    .from("work_progress_log_materials")
    .select("mat_code, uom_mat, qty_fact")
    .eq("log_id", log.id);

  const matsRowsRaw: LogMaterialRow[] = Array.isArray(mats) ? (mats as LogMaterialRow[]) : [];
  const codes = matsRowsRaw.map((m) => m.mat_code).filter(Boolean);
  const namesMap: Record<string, { name: string; uom: string | null }> = {};
  if (codes.length) {
    const ci = await supabaseClient
      .from("catalog_items")
      .select("rik_code, name_human_ru, name_human, uom_code")
      .in("rik_code", codes);

    if (!ci.error && Array.isArray(ci.data)) {
      for (const n of ci.data as CatalogItemRow[]) {
        const code = String(n.rik_code || "");
        namesMap[code] = {
          name: n.name_human_ru || n.name_human || code,
          uom: n.uom_code || null,
        };
      }
    }
  }

  const matsRows: WorkMaterialRow[] = matsRowsRaw.map((m) => {
    const code = String(m.mat_code || "");
    const meta = namesMap[code];
    const quantity = Number(m.qty_fact ?? 0);
    return {
      material_id: null,
      qty: quantity,
      mat_code: code,
      name: meta?.name || code,
      uom: meta?.uom || m.uom_mat || "",
      available: 0,
      qty_fact: quantity,
    } satisfies WorkMaterialRow;
  });

  const actWork: ContractorPdfWorkRowLike = {
    ...workModalRow,
    qty_done: log.qty,
    qty_left: Math.max(0, Number(workModalRow.qty_planned || 0) - Number(log.qty || 0)),
  };
  const meta = parseActMeta(log.note);
  const selectedWorksForPdf: SelectedWorkForPdf[] = meta.selectedWorks.map((name) => ({
    name,
    unit: workModalRow?.uom_id || "",
    price: Number(jobHeader?.unit_price || 0),
    qty: 1,
    comment: "",
  }));
  const resolvedObj = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";

  await generateActPdf({
    mode: "normal",
    work: toPdfWork(actWork, resolvedObj || actWork.object_name || null),
    materials: matsRows,
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
    actNumber: String(log.id || "").slice(0, 8),
  });
}
