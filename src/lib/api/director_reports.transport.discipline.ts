import type {
  DirectorFactRow,
  DisciplineRowsSource,
} from "./director_reports.shared";
import { createDirectorReportsAggregationContractRequiredError } from "./director_reports.aggregation.contracts";

async function fetchDirectorDisciplineSourceRowsViaRpc(_p: {
  from: string;
  to: string;
}): Promise<DirectorFactRow[]> {
  throw createDirectorReportsAggregationContractRequiredError("director discipline source rows rpc fallback");
}

async function fetchAllFactRowsFromTables(_p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName?: Record<string, string | null>;
  skipMaterialNameResolve?: boolean;
}): Promise<DirectorFactRow[]> {
  throw createDirectorReportsAggregationContractRequiredError("director discipline table fallback");
}

async function fetchDisciplineFactRowsFromTables(_p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName?: Record<string, string | null>;
  skipMaterialNameResolve?: boolean;
}): Promise<DirectorFactRow[]> {
  throw createDirectorReportsAggregationContractRequiredError("director discipline fact table fallback");
}

async function fetchFactRowsForDiscipline(_p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
  skipMaterialNameResolve?: boolean;
}): Promise<{ rows: DirectorFactRow[]; source: DisciplineRowsSource; chain: DisciplineRowsSource[] }> {
  throw createDirectorReportsAggregationContractRequiredError("director discipline row fallback");
}

export {
  fetchAllFactRowsFromTables,
  fetchDirectorDisciplineSourceRowsViaRpc,
  fetchDisciplineFactRowsFromTables,
  fetchFactRowsForDiscipline,
};
