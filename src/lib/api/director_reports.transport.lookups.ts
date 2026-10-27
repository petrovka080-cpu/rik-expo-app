import type { RequestLookupRow } from "./director_reports.shared";
import {
  applyBatchReliabilityPlan,
  createBatchReliabilityPlan,
} from "../async/fanoutBatchPlan";
import {
  fetchObjectTypeNamesByCode,
  fetchObjectsByIds,
  fetchSystemNamesByCode,
} from "./director_reports.naming";
import { recordDirectorReportsTransportWarning } from "./director_reports.observability";

type DirectorRequestContextLookupKey =
  | "objectNameById"
  | "objectTypeNameByCode"
  | "systemNameByCode";

const DIRECTOR_REQUEST_CONTEXT_LOOKUP_BATCH_PLAN =
  createBatchReliabilityPlan<DirectorRequestContextLookupKey>([
    { key: "objectNameById", critical: false },
    { key: "objectTypeNameByCode", critical: false },
    { key: "systemNameByCode", critical: false },
  ]);

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

  const [objectNameByIdResult, objectTypeNameByCodeResult, systemNameByCodeResult] =
    await Promise.allSettled([
    fetchObjectsByIds(objectIds),
    fetchObjectTypeNamesByCode(objectTypeCodes),
    fetchSystemNamesByCode(systemCodes),
  ]);

  const applied = applyBatchReliabilityPlan({
    plan: DIRECTOR_REQUEST_CONTEXT_LOOKUP_BATCH_PLAN,
    settled: {
      objectNameById: objectNameByIdResult,
      objectTypeNameByCode: objectTypeNameByCodeResult,
      systemNameByCode: systemNameByCodeResult,
    },
    getFallbackValue: () => new Map<string, string>(),
    getFallbackMessage: (key) => `Director request context lookup failed: ${key}`,
  });

  for (const failure of applied.failures) {
    recordDirectorReportsTransportWarning("request_context_lookup_optional_failed", failure.error.error, {
      lookup: failure.key,
      batchStatus: applied.status,
      objectIdCount: objectIds.length,
      objectTypeCodeCount: objectTypeCodes.length,
      systemCodeCount: systemCodes.length,
    });
  }

  return {
    objectNameById: applied.values.objectNameById,
    objectTypeNameByCode: applied.values.objectTypeNameByCode,
    systemNameByCode: applied.values.systemNameByCode,
  };
}

export { loadDirectorRequestContextLookups };
