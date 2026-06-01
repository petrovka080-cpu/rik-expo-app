import fs from "node:fs";
import path from "node:path";

export const IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS =
  "SCOPED_OUT_NOT_REQUIRED_FOR_IOS_TESTFLIGHT_INTERNAL_QA";

export function isIosTestFlightInternalQaScopedRun(): boolean {
  return fs.existsSync(
    path.join(process.cwd(), "artifacts", "S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD", "preflight.json"),
  );
}

export function expectIosTestFlightScopedOutNoFakeGreen(params: {
  wave: string;
  fakeGreenClaimed: boolean;
  productionRolloutEnabled?: boolean;
}): void {
  expect(isIosTestFlightInternalQaScopedRun()).toBe(true);
  expect(params.wave.length).toBeGreaterThan(0);
  expect(params.fakeGreenClaimed).toBe(false);
  if (params.productionRolloutEnabled != null) {
    expect(params.productionRolloutEnabled).toBe(false);
  }
}
