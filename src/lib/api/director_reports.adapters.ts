// @ts-ignore TS5097: Supabase Edge/Deno runtime requires explicit .ts extensions here.
import type {
  CanonicalMaterialsPayloadRaw,
  CanonicalOptionsPayloadRaw,
  DirectorDisciplineLevel,
  DirectorDisciplineMaterial,
  DirectorDisciplinePayload,
  DirectorDisciplineWork,
  DirectorObjectIdentityResolved,
  DirectorReportOptions,
  DirectorReportPayload,
} from "./director_reports.shared.ts";
// @ts-ignore TS5097: Supabase Edge/Deno runtime requires explicit .ts extensions here.
import {
  DASH,
  asRecord,
  buildDirectorLocationLabel,
  buildDirectorReportOptionsFromIdentities,
  canonicalObjectName,
  normLevelName,
  normWorkName,
  resolveDirectorObjectIdentity,
  toNum,
} from "./director_reports.shared.ts";

const unwrapRpcPayload = (data: unknown): unknown => {
  if (Array.isArray(data)) {
    if (!data.length) return null;
    const first = data[0];
    if (first && typeof first === "object" && "payload" in first) {
      return (first as { payload?: unknown }).payload ?? null;
    }
    return first ?? null;
  }
  return data ?? null;
};

const adaptCanonicalMaterialsPayload = (payloadRaw: unknown): DirectorReportPayload | null => {
  const p = payloadRaw && typeof payloadRaw === "object" ? (payloadRaw as CanonicalMaterialsPayloadRaw) : null;
  if (!p) return null;
  const rows = Array.isArray(p.rows) ? p.rows : [];
  const kpi = asRecord(p.kpi);
  const reportOptions = asRecord(p.report_options);
  const objectIdByName = asRecord(reportOptions.objectIdByName);
  return {
    ...p,
    rows,
    kpi: {
      issues_total: toNum(kpi.issues_total),
      issues_without_object: toNum(kpi.issues_without_object),
      items_total: toNum(kpi.items_total),
      items_without_request: toNum(kpi.items_without_request),
    },
    report_options: {
      objects: Array.isArray(reportOptions.objects) ? reportOptions.objects.map((v) => String(v)) : [],
      objectIdByName: Object.fromEntries(
        Object.entries(objectIdByName).map(([key, value]) => [key, value == null ? null : String(value)]),
      ),
    },
  };
};

const adaptCanonicalOptionsPayload = (payloadRaw: unknown): DirectorReportOptions | null => {
  const p = payloadRaw && typeof payloadRaw === "object" ? (payloadRaw as CanonicalOptionsPayloadRaw) : null;
  if (!p) return null;
  const objectIdByNameRaw = asRecord(p.objectIdByName);
  const identities: DirectorObjectIdentityResolved[] = [];

  for (const [nameRaw, objectIdRaw] of Object.entries(objectIdByNameRaw)) {
    identities.push(
      resolveDirectorObjectIdentity({
        object_name_display: nameRaw,
        object_id_resolved: objectIdRaw == null ? null : String(objectIdRaw),
      }),
    );
  }

  if (Array.isArray(p.objects)) {
    for (const nameRaw of p.objects) {
      const displayName = String(nameRaw ?? "");
      identities.push(
        resolveDirectorObjectIdentity({
          object_name_display: displayName,
          object_id_resolved:
            objectIdByNameRaw[displayName] == null ? null : String(objectIdByNameRaw[displayName]),
        }),
      );
    }
  }

  if (!identities.length) return { objects: [], objectIdByName: {} };
  return buildDirectorReportOptionsFromIdentities(identities);
};

const adaptCanonicalWorksPayload = (payloadRaw: unknown): DirectorDisciplinePayload | null => {
  const p = payloadRaw && typeof payloadRaw === "object" ? payloadRaw : null;
  if (!p) return null;
  const summary = "summary" in p ? asRecord((p as { summary?: unknown }).summary) : null;
  const works = "works" in p && Array.isArray((p as { works?: unknown }).works) ? (p as { works: unknown[] }).works : null;
  if (!summary || !works) return null;
  const adaptedWorks: DirectorDisciplineWork[] = works.map((workValue) => {
    const work = asRecord(workValue);
    const workTypeName = normWorkName(work.work_type_name ?? work.id);
    const levelsRaw = Array.isArray(work.levels) ? work.levels : [];
    const levels: DirectorDisciplineLevel[] = levelsRaw.map((levelValue) => {
      const level = asRecord(levelValue);
      const objectName = canonicalObjectName(level.object_name);
      const levelName = normLevelName(level.level_name);
      const systemName = String(level.system_name ?? "").trim() || null;
      const zoneName = String(level.zone_name ?? "").trim() || null;
      const locationLabel =
        String(level.location_label ?? "").trim() ||
        buildDirectorLocationLabel({
          objectName,
          levelName,
          systemName,
          zoneName,
        });
      const materialsRaw = Array.isArray(level.materials) ? level.materials : [];
      const materials: DirectorDisciplineMaterial[] = materialsRaw.map((materialValue) => {
        const material = asRecord(materialValue);
        const rikCode = String(material.rik_code ?? "").trim().toUpperCase() || DASH;
        const materialName = String(material.material_name ?? "").trim() || rikCode;
        return {
          material_name: materialName,
          rik_code: rikCode,
          uom: String(material.uom ?? "").trim(),
          qty_sum: toNum(material.qty_sum),
          docs_count: toNum(material.docs_count),
          unit_price: toNum(material.unit_price),
          amount_sum: toNum(material.amount_sum),
          source_issue_ids: Array.isArray(material.source_issue_ids)
            ? material.source_issue_ids.map((value) => String(value ?? "").trim()).filter(Boolean)
            : [],
          source_request_item_ids: Array.isArray(material.source_request_item_ids)
            ? material.source_request_item_ids.map((value) => String(value ?? "").trim()).filter(Boolean)
            : [],
        };
      });
      return {
        id: String(level.id ?? `${workTypeName}::${locationLabel}`).trim() || `${workTypeName}::${locationLabel}`,
        level_name: levelName,
        object_name: objectName,
        system_name: systemName,
        zone_name: zoneName,
        location_label: locationLabel,
        total_qty: toNum(level.total_qty),
        total_docs: toNum(level.total_docs),
        total_positions: toNum(level.total_positions),
        share_in_work_pct: toNum(level.share_in_work_pct),
        req_positions: toNum(level.req_positions),
        free_positions: toNum(level.free_positions),
        source_issue_ids: Array.isArray(level.source_issue_ids)
          ? level.source_issue_ids.map((value) => String(value ?? "").trim()).filter(Boolean)
          : [],
        source_request_item_ids: Array.isArray(level.source_request_item_ids)
          ? level.source_request_item_ids.map((value) => String(value ?? "").trim()).filter(Boolean)
          : [],
        materials,
      };
    });
    return {
      id: String(work.id ?? workTypeName).trim() || workTypeName,
      work_type_name: workTypeName,
      total_qty: toNum(work.total_qty),
      total_docs: toNum(work.total_docs),
      total_positions: toNum(work.total_positions),
      share_total_pct: toNum(work.share_total_pct),
      req_positions: toNum(work.req_positions),
      free_positions: toNum(work.free_positions),
      location_count: Math.max(toNum(work.location_count), levels.length),
      levels,
    };
  });
  return {
    summary: {
      total_qty: toNum(summary.total_qty),
      total_docs: toNum(summary.total_docs),
      total_positions: toNum(summary.total_positions),
      pct_without_work: toNum(summary.pct_without_work),
      pct_without_level: toNum(summary.pct_without_level),
      pct_without_request: toNum(summary.pct_without_request),
      issue_cost_total: toNum(summary.issue_cost_total),
      purchase_cost_total: toNum(summary.purchase_cost_total),
      issue_to_purchase_pct: toNum(summary.issue_to_purchase_pct),
      unpriced_issue_pct: toNum(summary.unpriced_issue_pct),
    },
    works: adaptedWorks,
  };
};

export {
  unwrapRpcPayload,
  adaptCanonicalMaterialsPayload,
  adaptCanonicalOptionsPayload,
  adaptCanonicalWorksPayload,
};
