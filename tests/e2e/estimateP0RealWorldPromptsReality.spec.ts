import { expect, test } from "playwright/test";

import {
  collectAiQualityChecks,
  findCheck,
} from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

test.describe("estimate P0 real-world prompts reality", () => {
  test("keeps known construction prompts on specific work keys and non-generic rows", () => {
    const check = findCheck(collectAiQualityChecks(), "estimate_p0_real_world_prompts_specific_rows");

    expect(check.passed).toBe(true);
    expect(check.details?.promptResults).toBeTruthy();
  });
});
