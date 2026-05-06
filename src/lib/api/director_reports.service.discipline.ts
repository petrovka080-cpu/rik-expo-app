import type { DirectorDisciplinePayload } from "./director_reports.shared";
import { rpcDate } from "./director_reports.shared";
import { loadDirectorReportTransportScope } from "./directorReportsTransport.service";
import {
  trackedResult,
  type DirectorReportTrackedResult,
} from "./director_reports.service.shared";

export async function fetchDirectorWarehouseReportDisciplineTracked(
  p: {
    from: string;
    to: string;
    objectName: string | null;
    objectIdByName: Record<string, string | null>;
  },
  opts?: { skipPrices?: boolean },
): Promise<DirectorReportTrackedResult<DirectorDisciplinePayload>> {
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const scope = await loadDirectorReportTransportScope({
    from: pFrom,
    to: pTo,
    objectName: p.objectName ?? null,
    includeDiscipline: true,
    skipDisciplinePrices: !!opts?.skipPrices,
  });

  if (!scope.discipline || !scope.disciplineMeta) {
    throw new Error("director_report_transport_scope_v1 returned empty discipline payload");
  }

  return trackedResult(scope.discipline, scope.disciplineMeta);
}

export async function fetchDirectorWarehouseReportDiscipline(
  p: {
    from: string;
    to: string;
    objectName: string | null;
    objectIdByName: Record<string, string | null>;
  },
  opts?: { skipPrices?: boolean },
): Promise<DirectorDisciplinePayload> {
  const { payload } = await fetchDirectorWarehouseReportDisciplineTracked(p, opts);
  return payload;
}
