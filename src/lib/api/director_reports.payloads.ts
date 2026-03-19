import { normalizeRuText } from "../text/encoding";
import type {
  DirectorDisciplineLevel,
  DirectorDisciplineMaterial,
  DirectorDisciplinePayload,
  DirectorDisciplineWork,
  DirectorFactRow,
  DirectorReportPayload,
  DirectorReportRow,
  DirectorReportWho,
} from "./director_reports.shared";
import {
  DASH,
  WITHOUT_LEVEL,
  WITHOUT_WORK,
  buildDirectorLocationLabel,
  canonicalObjectName,
  getDirectorFactObjectIdentity,
  normLevelName,
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

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function buildDisciplinePayloadFromFactRowsLegacy(
  rows: DirectorFactRow[],
  cost?: {
    issue_cost_total?: number;
    purchase_cost_total?: number;
    issue_to_purchase_pct?: number;
    unpriced_issue_pct?: number;
    price_by_code?: Map<string, number>;
    price_by_request_item?: Map<string, number>;
  },
): DirectorDisciplinePayload {
  const docsAll = new Set<string>();
  let totalQty = 0;
  let totalPositions = 0;
  let qtyWithoutWork = 0;
  let qtyWithoutLevel = 0;
  let positionsWithoutReq = 0;

  const byWork = new Map<
    string,
    {
      work_type_name: string;
      total_qty: number;
      docs: Set<string>;
      total_positions: number;
      req_positions: number;
      free_positions: number;
      levels: Map<
        string,
        {
          level_name: string;
          total_qty: number;
          docs: Set<string>;
          total_positions: number;
          req_positions: number;
          free_positions: number;
          materials: Map<
            string,
            {
              material_name: string;
              rik_code: string;
              uom: string;
              qty_sum: number;
              amount_sum: number;
              docs: Set<string>;
            }
          >;
        }
      >;
    }
  >();

  for (const r of rows) {
    const issueId = String(r?.issue_id ?? "").trim();
    if (!issueId) continue;
    const workName = normWorkName(r?.work_name_resolved);
    const levelName = normLevelName(r?.level_name_resolved);
    const code = String(r?.rik_code_resolved ?? "").trim().toUpperCase() || DASH;
    const uom = String(r?.uom_resolved ?? "").trim();
    const materialName = String(r?.material_name_resolved ?? "").trim() || code;
    const qty = toNum(r?.qty);
    const reqItemId = String(r?.request_item_id ?? "").trim();
    const price = reqItemId
      ? toNum(cost?.price_by_request_item?.get(reqItemId) ?? cost?.price_by_code?.get(code) ?? 0)
      : toNum(cost?.price_by_code?.get(code) ?? 0);
    const amount = price > 0 ? qty * price : 0;
    const isWithoutReq = !!r?.is_without_request;

    docsAll.add(issueId);
    totalQty += qty;
    totalPositions += 1;
    if (workName === WITHOUT_WORK) qtyWithoutWork += qty;
    if (levelName === WITHOUT_LEVEL) qtyWithoutLevel += qty;
    if (isWithoutReq) positionsWithoutReq += 1;

    const workEntry =
      byWork.get(workName) ??
      {
        work_type_name: workName,
        total_qty: 0,
        docs: new Set<string>(),
        total_positions: 0,
        req_positions: 0,
        free_positions: 0,
        levels: new Map(),
      };
    workEntry.total_qty += qty;
    workEntry.docs.add(issueId);
    workEntry.total_positions += 1;
    if (isWithoutReq) workEntry.free_positions += 1;
    else workEntry.req_positions += 1;

    const levelEntry =
      workEntry.levels.get(levelName) ??
      {
        level_name: levelName,
        total_qty: 0,
        docs: new Set<string>(),
        total_positions: 0,
        req_positions: 0,
        free_positions: 0,
        materials: new Map(),
      };
    levelEntry.total_qty += qty;
    levelEntry.docs.add(issueId);
    levelEntry.total_positions += 1;
    if (isWithoutReq) levelEntry.free_positions += 1;
    else levelEntry.req_positions += 1;

    const mKey = `${code}::${uom}`;
    const mEntry =
      levelEntry.materials.get(mKey) ??
      {
        material_name: materialName,
        rik_code: code,
        uom,
        qty_sum: 0,
        amount_sum: 0,
        docs: new Set<string>(),
      };
    mEntry.qty_sum += qty;
    mEntry.amount_sum += amount;
    mEntry.docs.add(issueId);
    levelEntry.materials.set(mKey, mEntry);

    workEntry.levels.set(levelName, levelEntry);
    byWork.set(workName, workEntry);
  }

  const works: DirectorDisciplineWork[] = Array.from(byWork.values())
    .map((w) => {
      const levels: DirectorDisciplineLevel[] = Array.from(w.levels.values())
        .map((lv) => {
          const materials: DirectorDisciplineMaterial[] = Array.from(lv.materials.values())
            .map((m) => ({
              material_name: m.material_name,
              rik_code: m.rik_code,
              uom: m.uom,
              qty_sum: m.qty_sum,
              docs_count: m.docs.size,
              unit_price: m.qty_sum > 0 ? m.amount_sum / m.qty_sum : 0,
              amount_sum: m.amount_sum,
            }))
            .sort((a, b) => (b.amount_sum ?? 0) - (a.amount_sum ?? 0) || b.qty_sum - a.qty_sum);
          return {
            id: `${w.work_type_name}::${lv.level_name}`,
            level_name: lv.level_name,
            total_qty: lv.total_qty,
            total_docs: lv.docs.size,
            total_positions: lv.total_positions,
            share_in_work_pct: pct(lv.total_qty, w.total_qty),
            req_positions: lv.req_positions,
            free_positions: lv.free_positions,
            materials,
          };
        })
        .sort((a, b) => b.total_qty - a.total_qty);
      return {
        id: w.work_type_name,
        work_type_name: w.work_type_name,
        total_qty: w.total_qty,
        total_docs: w.docs.size,
        total_positions: w.total_positions,
        share_total_pct: pct(w.total_qty, totalQty),
        req_positions: w.req_positions,
        free_positions: w.free_positions,
        levels,
      };
    })
    .sort((a, b) => b.total_qty - a.total_qty);

  return {
    summary: {
      total_qty: totalQty,
      total_docs: docsAll.size,
      total_positions: totalPositions,
      pct_without_work: pct(qtyWithoutWork, totalQty),
      pct_without_level: pct(qtyWithoutLevel, totalQty),
      pct_without_request: pct(positionsWithoutReq, totalPositions),
      issue_cost_total: Number(cost?.issue_cost_total ?? 0),
      purchase_cost_total: Number(cost?.purchase_cost_total ?? 0),
      issue_to_purchase_pct: Number(cost?.issue_to_purchase_pct ?? 0),
      unpriced_issue_pct: Number(cost?.unpriced_issue_pct ?? 0),
    },
    works,
  };
}

function buildDisciplinePayloadFromFactRows(
  rows: DirectorFactRow[],
  cost?: {
    issue_cost_total?: number;
    purchase_cost_total?: number;
    issue_to_purchase_pct?: number;
    unpriced_issue_pct?: number;
    price_by_code?: Map<string, number>;
    price_by_request_item?: Map<string, number>;
  },
): DirectorDisciplinePayload {
  const docsAll = new Set<string>();
  let totalQty = 0;
  let totalPositions = 0;
  let qtyWithoutWork = 0;
  let qtyWithoutLevel = 0;
  let positionsWithoutReq = 0;

  const withoutWorkKey = String(WITHOUT_WORK || "").trim().toLowerCase();
  const byWork = new Map<
    string,
    {
      work_type_name: string;
      total_qty: number;
      docs: Set<string>;
      total_positions: number;
      req_positions: number;
      free_positions: number;
      locations: Map<
        string,
        {
          object_name: string;
          level_name: string;
          system_name: string | null;
          zone_name: string | null;
          location_label: string;
          total_qty: number;
          docs: Set<string>;
          total_positions: number;
          req_positions: number;
          free_positions: number;
          source_issue_ids: Set<string>;
          source_request_item_ids: Set<string>;
          materials: Map<
            string,
            {
              material_name: string;
              rik_code: string;
              uom: string;
              qty_sum: number;
              amount_sum: number;
              docs: Set<string>;
              source_issue_ids: Set<string>;
              source_request_item_ids: Set<string>;
            }
          >;
        }
      >;
    }
  >();

  for (const r of rows) {
    if (r.item_kind !== "material") continue;
    const issueId = String(r?.issue_id ?? "").trim();
    if (!issueId) continue;

    const workName = normWorkName(r?.work_name_resolved);
    const objectName = canonicalObjectName(r?.object_name_resolved);
    const levelName = normLevelName(r?.level_name_resolved);
    const systemName = String(normalizeRuText(String(r?.system_name_resolved ?? ""))).trim() || null;
    const zoneName = String(normalizeRuText(String(r?.zone_name_resolved ?? ""))).trim() || null;
    const locationLabel = buildDirectorLocationLabel({
      objectName,
      levelName,
      systemName,
      zoneName,
    });
    const locationKey = [objectName, levelName, systemName || "", zoneName || ""].join("::");

    const code = String(r?.rik_code_resolved ?? "").trim().toUpperCase() || DASH;
    const uom = String(r?.uom_resolved ?? "").trim();
    const materialName = String(r?.material_name_resolved ?? "").trim() || code;
    const qty = toNum(r?.qty);
    const reqItemId = String(r?.request_item_id ?? "").trim();
    const price = reqItemId
      ? toNum(cost?.price_by_request_item?.get(reqItemId) ?? cost?.price_by_code?.get(code) ?? 0)
      : toNum(cost?.price_by_code?.get(code) ?? 0);
    const amount = price > 0 ? qty * price : 0;
    const isWithoutReq = !!r?.is_without_request;
    const isWithoutWork = String(workName || "").trim().toLowerCase().startsWith(withoutWorkKey);

    docsAll.add(issueId);
    totalQty += qty;
    totalPositions += 1;
    if (isWithoutWork) qtyWithoutWork += qty;
    if (levelName === WITHOUT_LEVEL) qtyWithoutLevel += qty;
    if (isWithoutReq) positionsWithoutReq += 1;

    const workEntry =
      byWork.get(workName) ?? {
        work_type_name: workName,
        total_qty: 0,
        docs: new Set<string>(),
        total_positions: 0,
        req_positions: 0,
        free_positions: 0,
        locations: new Map(),
      };
    workEntry.total_qty += qty;
    workEntry.docs.add(issueId);
    workEntry.total_positions += 1;
    if (isWithoutReq) workEntry.free_positions += 1;
    else workEntry.req_positions += 1;

    const locationEntry =
      workEntry.locations.get(locationKey) ?? {
        object_name: objectName,
        level_name: levelName,
        system_name: systemName,
        zone_name: zoneName,
        location_label: locationLabel,
        total_qty: 0,
        docs: new Set<string>(),
        total_positions: 0,
        req_positions: 0,
        free_positions: 0,
        source_issue_ids: new Set<string>(),
        source_request_item_ids: new Set<string>(),
        materials: new Map(),
      };
    locationEntry.total_qty += qty;
    locationEntry.docs.add(issueId);
    locationEntry.total_positions += 1;
    locationEntry.source_issue_ids.add(issueId);
    if (reqItemId) locationEntry.source_request_item_ids.add(reqItemId);
    if (isWithoutReq) locationEntry.free_positions += 1;
    else locationEntry.req_positions += 1;

    const materialKey = `${code}::${uom}::${materialName}`;
    const materialEntry =
      locationEntry.materials.get(materialKey) ?? {
        material_name: materialName,
        rik_code: code,
        uom,
        qty_sum: 0,
        amount_sum: 0,
        docs: new Set<string>(),
        source_issue_ids: new Set<string>(),
        source_request_item_ids: new Set<string>(),
      };
    materialEntry.qty_sum += qty;
    materialEntry.amount_sum += amount;
    materialEntry.docs.add(issueId);
    materialEntry.source_issue_ids.add(issueId);
    if (reqItemId) materialEntry.source_request_item_ids.add(reqItemId);

    locationEntry.materials.set(materialKey, materialEntry);
    workEntry.locations.set(locationKey, locationEntry);
    byWork.set(workName, workEntry);
  }

  const works: DirectorDisciplineWork[] = Array.from(byWork.values())
    .map((w) => {
      const levels: DirectorDisciplineLevel[] = Array.from(w.locations.values())
        .map((loc) => {
          const materials: DirectorDisciplineMaterial[] = Array.from(loc.materials.values())
            .map((m) => ({
              material_name: m.material_name,
              rik_code: m.rik_code,
              uom: m.uom,
              qty_sum: m.qty_sum,
              docs_count: m.docs.size,
              unit_price: m.qty_sum > 0 ? m.amount_sum / m.qty_sum : 0,
              amount_sum: m.amount_sum,
              source_issue_ids: Array.from(m.source_issue_ids.values()),
              source_request_item_ids: Array.from(m.source_request_item_ids.values()),
            }))
            .sort((a, b) => {
              const byAmount = (b.amount_sum ?? 0) - (a.amount_sum ?? 0);
              if (byAmount !== 0) return byAmount;
              const byQty = b.qty_sum - a.qty_sum;
              if (byQty !== 0) return byQty;
              return a.material_name.localeCompare(b.material_name, "ru");
            });

          return {
            id: `${w.work_type_name}::${loc.location_label}`,
            level_name: loc.level_name,
            object_name: loc.object_name,
            system_name: loc.system_name,
            zone_name: loc.zone_name,
            location_label: loc.location_label,
            total_qty: loc.total_qty,
            total_docs: loc.docs.size,
            total_positions: loc.total_positions,
            share_in_work_pct: pct(loc.total_qty, w.total_qty),
            req_positions: loc.req_positions,
            free_positions: loc.free_positions,
            source_issue_ids: Array.from(loc.source_issue_ids.values()),
            source_request_item_ids: Array.from(loc.source_request_item_ids.values()),
            materials,
          };
        })
        .sort((a, b) => {
          const byQty = b.total_qty - a.total_qty;
          if (byQty !== 0) return byQty;
          const byPositions = b.total_positions - a.total_positions;
          if (byPositions !== 0) return byPositions;
          return String(a.location_label ?? "").localeCompare(String(b.location_label ?? ""), "ru");
        });

      return {
        id: w.work_type_name,
        work_type_name: w.work_type_name,
        total_qty: w.total_qty,
        total_docs: w.docs.size,
        total_positions: w.total_positions,
        share_total_pct: pct(w.total_qty, totalQty),
        req_positions: w.req_positions,
        free_positions: w.free_positions,
        location_count: levels.length,
        levels,
      };
    })
    .sort((a, b) => {
      const byQty = b.total_qty - a.total_qty;
      if (byQty !== 0) return byQty;
      const byPositions = b.total_positions - a.total_positions;
      if (byPositions !== 0) return byPositions;
      return a.work_type_name.localeCompare(b.work_type_name, "ru");
    });

  return {
    summary: {
      total_qty: totalQty,
      total_docs: docsAll.size,
      total_positions: totalPositions,
      pct_without_work: pct(qtyWithoutWork, totalQty),
      pct_without_level: pct(qtyWithoutLevel, totalQty),
      pct_without_request: pct(positionsWithoutReq, totalPositions),
      issue_cost_total: Number(cost?.issue_cost_total ?? 0),
      purchase_cost_total: Number(cost?.purchase_cost_total ?? 0),
      issue_to_purchase_pct: Number(cost?.issue_to_purchase_pct ?? 0),
      unpriced_issue_pct: Number(cost?.unpriced_issue_pct ?? 0),
    },
    works,
  };
}

const materialSnapshotFromPayload = (payload: DirectorReportPayload | null | undefined) => {
  const kpi = payload?.kpi;
  const rowsCount = Array.isArray(payload?.rows) ? payload.rows.length : 0;
  return {
    kpi: {
      items_total: toNum(kpi?.items_total),
      items_without_request: toNum(kpi?.items_without_request),
    },
    rows_count: rowsCount,
  };
};

const worksSnapshotFromPayload = (payload: DirectorDisciplinePayload | null | undefined) => {
  const summary = payload?.summary;
  const works = Array.isArray(payload?.works) ? payload.works : [];
  const reqPositions = works.reduce((acc, w) => acc + toNum(w?.req_positions), 0);
  const freePositions = works.reduce((acc, w) => acc + toNum(w?.free_positions), 0);
  return {
    summary: {
      total_positions: toNum(summary?.total_positions),
      req_positions: reqPositions,
      free_positions: freePositions,
      issue_cost_total: toNum(summary?.issue_cost_total),
      purchase_cost_total: toNum(summary?.purchase_cost_total),
      unpriced_issue_pct: toNum(summary?.unpriced_issue_pct),
    },
    works_count: works.length,
  };
};

function collectDisciplinePriceInputs(rows: DirectorFactRow[]): {
  requestItemIds: string[];
  rowCodes: string[];
  costInputs: { code: string; requestItemId: string; qty: number }[];
} {
  const requestItemIds = new Set<string>();
  const rowCodes = new Set<string>();
  const costInputs: { code: string; requestItemId: string; qty: number }[] = [];

  for (const r of rows) {
    const requestItemId = String(r?.request_item_id ?? "").trim();
    const code = String(r?.rik_code_resolved ?? "").trim().toUpperCase();
    const qty = toNum(r?.qty);

    if (requestItemId) requestItemIds.add(requestItemId);
    if (code) rowCodes.add(code);
    if (!code || qty <= 0) continue;

    costInputs.push({ code, requestItemId, qty });
  }

  return {
    requestItemIds: Array.from(requestItemIds),
    rowCodes: Array.from(rowCodes),
    costInputs,
  };
}

export {
  buildPayloadFromFactRows,
  pct,
  buildDisciplinePayloadFromFactRowsLegacy,
  buildDisciplinePayloadFromFactRows,
  materialSnapshotFromPayload,
  worksSnapshotFromPayload,
  collectDisciplinePriceInputs,
};
