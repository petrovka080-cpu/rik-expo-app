import type { DirectorReportPayload } from "./director_reports.shared";
import { rpcDate } from "./director_reports.shared";
import { loadDirectorReportTransportScope } from "./directorReportsTransport.service";
import {
  trackedResult,
  type DirectorReportTrackedResult,
} from "./director_reports.service.shared";

export async function fetchDirectorWarehouseReportTracked(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<DirectorReportTrackedResult<DirectorReportPayload>> {
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const scope = await loadDirectorReportTransportScope({
    from: pFrom,
    to: pTo,
    objectName: p.objectName ?? null,
    includeDiscipline: false,
    skipDisciplinePrices: true,
  });

  if (!scope.report) {
    throw new Error("director_report_transport_scope_v1 returned empty report payload");
  }

  return trackedResult(scope.report, scope.reportMeta);
}

export async function fetchDirectorWarehouseReport(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<DirectorReportPayload> {
  const { payload } = await fetchDirectorWarehouseReportTracked(p);
  return payload;
}
