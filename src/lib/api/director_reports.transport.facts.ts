import type { DirectorFactRow } from "./director_reports.shared";
import { createDirectorReportsAggregationContractRequiredError } from "./director_reports.aggregation.contracts";

async function fetchDirectorFactViaAccRpc(_p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName?: Record<string, string | null>;
}): Promise<DirectorFactRow[]> {
  throw createDirectorReportsAggregationContractRequiredError("director fact acc rpc fallback");
}

async function fetchAllFactRowsFromView(_p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  throw createDirectorReportsAggregationContractRequiredError("director fact view fallback");
}

export {
  fetchAllFactRowsFromView,
  fetchDirectorFactViaAccRpc,
};
