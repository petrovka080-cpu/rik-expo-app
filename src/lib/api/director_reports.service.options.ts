import type { DirectorReportOptions } from "./director_reports.shared";
import { rpcDate } from "./director_reports.shared";
import { loadDirectorReportTransportScope } from "./directorReportsTransport.service";
import {
  trackedResult,
  type DirectorReportTrackedResult,
} from "./director_reports.service.shared";

export async function fetchDirectorWarehouseReportOptionsTracked(p: {
  from: string;
  to: string;
}): Promise<DirectorReportTrackedResult<DirectorReportOptions>> {
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const scope = await loadDirectorReportTransportScope({
    from: pFrom,
    to: pTo,
    objectName: null,
    includeDiscipline: false,
    skipDisciplinePrices: true,
  });

  return trackedResult(scope.options, scope.optionsMeta);
}

export async function fetchDirectorWarehouseReportOptions(p: {
  from: string;
  to: string;
}): Promise<DirectorReportOptions> {
  const { payload } = await fetchDirectorWarehouseReportOptionsTracked(p);
  return payload;
}
