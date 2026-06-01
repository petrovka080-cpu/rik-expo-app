import {
  expectScopedOutForCurrentIosTestFlight,
  hasCurrentIosTestFlightScopeArtifact,
} from "../helpers/currentReleaseWaveScope";

export const IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS =
  "SCOPED_OUT_NOT_REQUIRED_FOR_IOS_TESTFLIGHT_INTERNAL_QA";

export function isIosTestFlightInternalQaScopedRun(): boolean {
  return hasCurrentIosTestFlightScopeArtifact();
}

export function expectIosTestFlightScopedOutNoFakeGreen(params: {
  wave: string;
  fakeGreenClaimed: boolean;
  productionRolloutEnabled?: boolean;
}): void {
  expectScopedOutForCurrentIosTestFlight(params);
}
