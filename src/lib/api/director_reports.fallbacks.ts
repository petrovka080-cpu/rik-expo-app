import type {
  DirectorDisciplinePayload,
  DirectorReportOptions,
  DirectorReportPayload,
} from "./director_reports.shared";
import {
  WITHOUT_WORK,
  asRecord,
  resolveDirectorObjectIdentity,
  toNum,
} from "./director_reports.shared";

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

const shouldRejectScopedEmptyMaterialsPayload = (
  payload: DirectorReportPayload | null | undefined,
  objectName: string | null,
  options: DirectorReportOptions | null | undefined,
): boolean => {
  if (objectName == null) return false;
  if (hasDirectorReportMaterialContent(payload)) return false;
  const target = resolveDirectorObjectIdentity({ object_name_display: objectName }).object_name_canonical;
  const optionObjects = Array.isArray(options?.objects) ? options.objects : [];
  const targetExistsInOptions =
    optionObjects.some(
      (optionName) =>
        resolveDirectorObjectIdentity({ object_name_display: optionName }).object_name_canonical === target,
    ) || options?.objectIdByName?.[target] != null;
  return targetExistsInOptions;
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

const shouldRejectTransportScopeDisciplinePayload = (
  payload: DirectorDisciplinePayload | null | undefined,
  report: DirectorReportPayload | null | undefined,
): boolean => {
  const works = Array.isArray(payload?.works) ? payload.works : [];
  const reportRows = Array.isArray(report?.rows) ? report.rows : [];
  const reportItemsTotal = toNum(report?.kpi?.items_total);
  const disciplineHasContent =
    works.some(
      (work) =>
        toNum(work?.total_positions) > 0 ||
        toNum(work?.total_qty) > 0 ||
        toNum(work?.total_docs) > 0,
    ) || toNum(payload?.summary?.total_positions) > 0;
  const requiresSemanticDrilldown =
    reportRows.length > 0 || reportItemsTotal > 0 || disciplineHasContent;
  if (!requiresSemanticDrilldown) return false;
  if (hasCanonicalWorksDetailLevels(payload)) return false;

  const withoutWorkOnly =
    works.length > 0 &&
    works.every((work) => String(work?.work_type_name ?? "").trim().startsWith(WITHOUT_WORK));

  return works.length > 0 || disciplineHasContent || withoutWorkOnly;
};

export {
  hasDirectorReportMaterialContent,
  shouldRejectAllObjectsEmptyMaterialsPayload,
  shouldRejectScopedEmptyMaterialsPayload,
  hasCanonicalWorksDetailLevels,
  shouldRejectTransportScopeDisciplinePayload,
};
