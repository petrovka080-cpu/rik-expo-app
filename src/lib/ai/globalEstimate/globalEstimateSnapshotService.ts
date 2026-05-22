import type { GlobalEstimateInput, GlobalEstimateResult } from "./globalEstimateTypes";

export type GlobalEstimateSnapshotPayload = {
  work_key: string;
  country_code: string;
  state_or_region?: string;
  county?: string;
  city?: string;
  postal_code?: string;
  language: string;
  locale: string;
  currency: string;
  unit_system: string;
  input: GlobalEstimateInput;
  result: GlobalEstimateResult;
};

export function buildGlobalEstimateSnapshotPayload(input: GlobalEstimateInput, result: GlobalEstimateResult): GlobalEstimateSnapshotPayload {
  return {
    work_key: result.work.workKey,
    country_code: result.locale.countryCode,
    state_or_region: result.locale.stateOrRegion,
    county: result.locale.county,
    city: result.locale.city,
    postal_code: result.locale.postalCode,
    language: result.locale.language,
    locale: result.locale.locale,
    currency: result.locale.currency,
    unit_system: result.locale.unitSystem,
    input,
    result,
  };
}

export async function persistGlobalEstimateSnapshot(input: GlobalEstimateInput, result: GlobalEstimateResult): Promise<{
  persisted: false;
  payload: GlobalEstimateSnapshotPayload;
}> {
  return {
    persisted: false,
    payload: buildGlobalEstimateSnapshotPayload(input, result),
  };
}
