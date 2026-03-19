import type { DirectorDisciplinePayload, DirectorReportPayload } from "./director_reports.shared";
import { asRecord, toNum } from "./director_reports.shared";

const hasDirectorReportMaterialContent = (payload: DirectorReportPayload | null | undefined): boolean => {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (
    rows.some(
      (row) =>
        toNum(row?.qty_total) > 0 ||
        Math.round(toNum(row?.docs_cnt)) > 0 ||
        toNum(row?.qty_without_request) > 0 ||
        Math.round(toNum(row?.docs_without_request)) > 0,
    )
  ) {
    return true;
  }
  const kpi = payload?.kpi;
  return (
    toNum(kpi?.issues_total) > 0 ||
    toNum(kpi?.items_total) > 0 ||
    toNum(kpi?.items_without_request) > 0
  );
};

const shouldRejectAllObjectsEmptyMaterialsPayload = (
  payload: DirectorReportPayload | null | undefined,
  objectName: string | null,
  objectIdByName: Record<string, string | null>,
): boolean => {
  if (objectName != null) return false;
  if (hasDirectorReportMaterialContent(payload)) return false;
  const reportOptions = payload?.report_options;
  const payloadOptions = asRecord(reportOptions);
  const payloadObjects = Array.isArray(payloadOptions.objects) ? payloadOptions.objects : [];
  const payloadObjectIdByName = asRecord(payloadOptions.objectIdByName);
  return payloadObjects.length > 0 || Object.keys(payloadObjectIdByName).length > 0 || Object.keys(objectIdByName).length > 0;
};

const hasCanonicalWorksDetailLevels = (payload: DirectorDisciplinePayload | null | undefined): boolean => {
  const works = Array.isArray(payload?.works) ? payload.works : [];
  if (!works.length) return false;
  return works.some((work) => {
    const levels = Array.isArray(work?.levels) ? work.levels : [];
    if (!levels.length) return false;
    return levels.some((level) =>
      !!String(level?.object_name ?? "").trim() ||
      !!String(level?.system_name ?? "").trim() ||
      !!String(level?.zone_name ?? "").trim() ||
      !!String(level?.location_label ?? "").trim() ||
      (Array.isArray(level?.materials) && level.materials.length > 0),
    );
  });
};

export {
  hasDirectorReportMaterialContent,
  shouldRejectAllObjectsEmptyMaterialsPayload,
  hasCanonicalWorksDetailLevels,
};
