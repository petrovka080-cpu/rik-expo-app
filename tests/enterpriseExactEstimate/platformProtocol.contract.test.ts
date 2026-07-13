import fs from "node:fs";
import path from "node:path";

import {
  ENTERPRISE_EXACT_ESTIMATE_GREEN_STATUS,
} from "../../scripts/e2e/enterpriseExactEstimate.shared";
import {
  buildIosProtocolReadiness,
} from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate platform proof protocol", () => {
  it("declares required proof files and keeps iOS in protocol scope only", () => {
    const requiredFiles = [
      "scripts/e2e/enterpriseExactEstimate.shared.ts",
      "scripts/e2e/runEnterpriseExactEstimateBackendAcceptance.ts",
      "scripts/e2e/runEnterpriseExactEstimatePdfProof.ts",
      "scripts/e2e/runAndroidApi34EnterpriseExactEstimateSmoke.ts",
      "scripts/e2e/runEnterpriseExactEstimateCloseout.ts",
      "tests/e2e/enterpriseExactEstimate.web.spec.ts",
      "tests/e2e/enterpriseExactEstimate.responsive.web.spec.ts",
    ];
    const ios = buildIosProtocolReadiness();

    expect(ENTERPRISE_EXACT_ESTIMATE_GREEN_STATUS).toBe("GREEN_ENTERPRISE_EXACT_AI_ESTIMATE_PLATFORM_READY");
    expect(requiredFiles.filter((filePath) => !fs.existsSync(path.join(process.cwd(), filePath)))).toEqual([]);
    expect(ios.ios_build_started).toBe(false);
    expect(ios.eas_build_started).toBe(false);
    expect(ios.testflight_started).toBe(false);
    expect(ios.requires_new_ios_build).toBe(false);
    expect(ios.fake_ios_green_claimed).toBe(false);
    expect(ios.failures).toEqual([]);
  });
});
