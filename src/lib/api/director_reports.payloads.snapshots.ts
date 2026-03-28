import type {
  DirectorDisciplinePayload,
  DirectorReportPayload,
} from "./director_reports.shared";
import { toNum } from "./director_reports.shared";

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

export { materialSnapshotFromPayload, worksSnapshotFromPayload };
