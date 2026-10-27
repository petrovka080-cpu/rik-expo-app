import type {
  DirectorReportPayload,
  DirectorReportRow,
  DirectorReportWho,
} from "./director_reports.shared";
import {
  WITHOUT_OBJECT,
  buildReportOptionsFromByObjRows,
  normObjectName,
  normWorkName,
  normalizeLegacyByObjectRow,
  normalizeLegacyFastMaterialRow,
  toNum,
} from "./director_reports.shared";
import { runTypedRpc } from "./director_reports.transport.base";

async function fetchViaLegacyRpc(p: {
  from: string;
  to: string;
  objectId: string | null;
  objectName: string | null;
}): Promise<DirectorReportPayload> {
  const [summaryRes, materialsRes, byObjRes] = await Promise.all([
    runTypedRpc<Record<string, unknown>>("wh_report_issued_summary_fast", {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    }),
    runTypedRpc<Record<string, unknown>>("wh_report_issued_materials_fast", {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    }),
    runTypedRpc<Record<string, unknown>>("wh_report_issued_by_object_fast", {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    }),
  ]);

  if (summaryRes.error) throw summaryRes.error;
  if (materialsRes.error) throw materialsRes.error;
  if (byObjRes.error) throw byObjRes.error;

  const summary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : null;
  const matRows = Array.isArray(materialsRes.data) ? materialsRes.data : [];
  const objRows = Array.isArray(byObjRes.data) ? byObjRes.data : [];

  const normalizedMatRows = matRows.map(normalizeLegacyFastMaterialRow);
  const normalizedObjRows = objRows.map(normalizeLegacyByObjectRow);

  const rows: DirectorReportRow[] = normalizedMatRows
    .map((row) => ({
      rik_code: String(row.material_code ?? "").trim().toUpperCase(),
      name_human_ru: String(row.material_name ?? "").trim() || String(row.material_code ?? "").trim(),
      uom: String(row.uom ?? ""),
      qty_total: toNum(row.sum_total),
      docs_cnt: Math.round(toNum(row.docs_cnt)),
      qty_without_request: toNum(row.sum_free),
      docs_without_request: Math.round(toNum(row.docs_free)),
    }))
    .sort((left, right) => right.qty_total - left.qty_total);

  const disciplineAgg = new Map<string, number>();
  for (const row of normalizedObjRows) {
    const who = normWorkName(row.work_name);
    disciplineAgg.set(who, (disciplineAgg.get(who) || 0) + Math.round(toNum(row.lines_cnt)));
  }
  const discipline_who: DirectorReportWho[] = Array.from(disciplineAgg.entries())
    .map(([who, items_cnt]) => ({ who, items_cnt }))
    .sort((left, right) => right.items_cnt - left.items_cnt);
  const reportOptions = buildReportOptionsFromByObjRows(normalizedObjRows);

  return {
    meta: { from: p.from, to: p.to, object_name: p.objectName },
    kpi: {
      issues_total: Math.round(toNum(summary?.docs_total)),
      issues_without_object: normalizedObjRows
        .filter((row) => normObjectName(row.object_name) === WITHOUT_OBJECT)
        .reduce((acc: number, row) => acc + Math.round(toNum(row.docs_cnt)), 0),
      items_total: normalizedMatRows.reduce((acc: number, row) => acc + Math.round(toNum(row.lines_cnt)), 0),
      items_without_request: normalizedMatRows.reduce((acc: number, row) => acc + Math.round(toNum(row.lines_free)), 0),
    },
    rows,
    discipline_who,
    report_options: reportOptions,
  };
}

export { fetchViaLegacyRpc };
