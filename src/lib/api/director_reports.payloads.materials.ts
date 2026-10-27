import type {
  DirectorFactRow,
  DirectorReportPayload,
  DirectorReportRow,
  DirectorReportWho,
} from "./director_reports.shared";
import {
  DASH,
  getDirectorFactObjectIdentity,
  normWorkName,
  toNum,
} from "./director_reports.shared";

function buildPayloadFromFactRows(p: {
  from: string;
  to: string;
  objectName: string | null;
  rows: DirectorFactRow[];
}): DirectorReportPayload {
  const issueIds = new Set<string>();
  const issueIdsWithoutObject = new Set<string>();
  const objectIdByName: Record<string, string | null> = {};
  let itemsTotal = 0;
  let itemsWithoutRequest = 0;

  const byMaterial = new Map<
    string,
    {
      rik_code: string;
      name_human_ru: string;
      uom: string;
      qty_total: number;
      qty_without_request: number;
      docs_ids: Set<string>;
      docs_without_request_ids: Set<string>;
    }
  >();

  const byWork = new Map<string, number>();

  for (const r of p.rows) {
    const issueId = String(r?.issue_id ?? "").trim();
    if (!issueId) continue;

    const objectIdentity = getDirectorFactObjectIdentity(r);
    const workName = normWorkName(r?.work_name_resolved);
    const code = String(r?.rik_code_resolved ?? "").trim().toUpperCase();
    const qty = toNum(r?.qty);
    const uom = String(r?.uom_resolved ?? "").trim();
    const nameRu = String(r?.material_name_resolved ?? "").trim();
    const isWithoutRequest = !!r?.is_without_request;

    issueIds.add(issueId);
    if (objectIdentity.is_without_object) issueIdsWithoutObject.add(issueId);
    if (!(objectIdentity.object_name_canonical in objectIdByName)) {
      objectIdByName[objectIdentity.object_name_canonical] = objectIdentity.object_id_resolved;
    } else if (
      objectIdByName[objectIdentity.object_name_canonical] == null &&
      objectIdentity.object_id_resolved
    ) {
      objectIdByName[objectIdentity.object_name_canonical] = objectIdentity.object_id_resolved;
    }

    itemsTotal += 1;
    if (isWithoutRequest) itemsWithoutRequest += 1;
    byWork.set(workName, (byWork.get(workName) || 0) + 1);

    const key = `${code}::${uom}`;
    const prev =
      byMaterial.get(key) ??
      {
        rik_code: code,
        name_human_ru: nameRu || code || DASH,
        uom,
        qty_total: 0,
        qty_without_request: 0,
        docs_ids: new Set<string>(),
        docs_without_request_ids: new Set<string>(),
      };

    prev.qty_total += qty;
    prev.docs_ids.add(issueId);
    if (isWithoutRequest) {
      prev.qty_without_request += qty;
      prev.docs_without_request_ids.add(issueId);
    }
    byMaterial.set(key, prev);
  }

  const materialRows: DirectorReportRow[] = Array.from(byMaterial.values())
    .map((x) => ({
      rik_code: x.rik_code,
      name_human_ru: x.name_human_ru,
      uom: x.uom,
      qty_total: x.qty_total,
      docs_cnt: x.docs_ids.size,
      qty_without_request: x.qty_without_request,
      docs_without_request: x.docs_without_request_ids.size,
    }))
    .sort((a, b) => b.qty_total - a.qty_total);

  const discipline_who: DirectorReportWho[] = Array.from(byWork.entries())
    .map(([who, items_cnt]) => ({ who, items_cnt }))
    .sort((a, b) => b.items_cnt - a.items_cnt);

  return {
    meta: { from: p.from, to: p.to, object_name: p.objectName },
    kpi: {
      issues_total: issueIds.size,
      issues_without_object: issueIdsWithoutObject.size,
      items_total: itemsTotal,
      items_without_request: itemsWithoutRequest,
    },
    rows: materialRows,
    discipline_who,
    report_options: {
      objects: Object.keys(objectIdByName).sort((a, b) => a.localeCompare(b, "ru")),
      objectIdByName,
    },
  };
}

export { buildPayloadFromFactRows };
