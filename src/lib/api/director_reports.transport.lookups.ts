import type { RequestLookupRow } from "./director_reports.shared";
import {
  fetchObjectTypeNamesByCode,
  fetchObjectsByIds,
  fetchSystemNamesByCode,
} from "./director_reports.naming";

const normalizeLookupKeys = (values: Iterable<unknown>): string[] =>
  Array.from(
    new Set(
      Array.from(values)
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );

async function loadDirectorRequestContextLookups(params: {
  requests: Iterable<RequestLookupRow>;
  extraObjectIds?: Iterable<string | null | undefined>;
}): Promise<{
  objectNameById: Map<string, string>;
  objectTypeNameByCode: Map<string, string>;
  systemNameByCode: Map<string, string>;
}> {
  const requestRows = Array.from(params.requests);
  const objectIds = normalizeLookupKeys([
    ...requestRows.map((request) => request.object_id),
    ...(params.extraObjectIds ? Array.from(params.extraObjectIds) : []),
  ]);
  const objectTypeCodes = normalizeLookupKeys(
    requestRows.map((request) => request.object_type_code),
  );
  const systemCodes = normalizeLookupKeys(
    requestRows.map((request) => request.system_code),
  );

  const [objectNameById, objectTypeNameByCode, systemNameByCode] = await Promise.all([
    fetchObjectsByIds(objectIds),
    fetchObjectTypeNamesByCode(objectTypeCodes),
    fetchSystemNamesByCode(systemCodes),
  ]);

  return {
    objectNameById,
    objectTypeNameByCode,
    systemNameByCode,
  };
}

export { loadDirectorRequestContextLookups };
