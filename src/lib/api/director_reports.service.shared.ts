import type {
  DirectorDisciplinePayload,
  DirectorFactRow,
  DirectorReportOptions,
  DirectorReportPayload,
  DisciplineRowsSource,
} from "./director_reports.shared";
import { recordPlatformObservability } from "../observability/platformObservability";
import { recordDirectorReportsSourceChain } from "./director_reports.observability";

export type DirectorReportFetchStage = "options" | "report" | "discipline";

export type DirectorReportFetchBranch =
  | "transport_rpc"
  | "canonical_rpc"
  | "legacy_fast_rpc"
  | "acc_rpc"
  | "source_rpc"
  | "view"
  | "tables"
  | "empty";

export type DirectorReportFetchMeta = {
  stage: DirectorReportFetchStage;
  branch: DirectorReportFetchBranch;
  chain: DirectorReportFetchBranch[];
  cacheLayer: "none" | "rows" | "rows_slice";
  rowsSource?: DisciplineRowsSource | null;
  pricedStage?: "base" | "priced";
};

export type DirectorReportTrackedPayload =
  | DirectorReportOptions
  | DirectorReportPayload
  | DirectorDisciplinePayload
  | DirectorFactRow[];

export type DirectorReportTrackedResult<T extends DirectorReportTrackedPayload> = {
  payload: T;
  meta: DirectorReportFetchMeta;
};

export const trackedResult = <T extends DirectorReportTrackedPayload>(
  payload: T,
  meta: DirectorReportFetchMeta,
): DirectorReportTrackedResult<T> => {
  recordDirectorReportsSourceChain(meta, payload);
  return {
    payload,
    meta,
  };
};

const getDirectorReportsServiceErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (message) return message;
  }
  const raw = String(error ?? "").trim();
  return raw || fallback;
};

export const recordDirectorReportsServiceWarning = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  const message = getDirectorReportsServiceErrorMessage(error, event);
  console.warn("[director_reports.service]", { event, message, ...extra });
  recordPlatformObservability({
    screen: "director",
    surface: "reports_service",
    category: "fetch",
    event,
    result: "error",
    fallbackUsed: true,
    errorStage: event,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: message,
    extra: {
      module: "director_reports.service",
      owner: "reports_service",
      severity: "warn",
      ...extra,
    },
  });
};

export const branchFromDisciplineSource = (
  source: DisciplineRowsSource,
): DirectorReportFetchBranch => {
  switch (source) {
    case "acc_rpc":
      return "acc_rpc";
    case "source_rpc":
      return "source_rpc";
    case "view":
      return "view";
    case "tables":
      return "tables";
    default:
      return "empty";
  }
};

export const mapDisciplineChain = (
  chain: DisciplineRowsSource[] | undefined,
): DirectorReportFetchBranch[] => (Array.isArray(chain) ? chain.map(branchFromDisciplineSource) : []);

export const summarizeDisciplinePayload = (payload: DirectorDisciplinePayload | null) => {
  const works = Array.isArray(payload?.works) ? payload.works : [];
  let levels = 0;
  let materials = 0;
  for (const work of works) {
    const workLevels = Array.isArray(work.levels) ? work.levels : [];
    levels += workLevels.length;
    for (const level of workLevels) {
      materials += Array.isArray(level.materials) ? level.materials.length : 0;
    }
  }
  return {
    works: works.length,
    levels,
    materials,
  };
};
