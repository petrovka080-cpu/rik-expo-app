import {
  buildReleaseVerifyOwnerReport,
} from "../../scripts/release/releaseStateCleanupCore";
import { greenCoreReport } from "./scopedReleaseVerifyTestHelpers";

it("does not produce a generic release green while owner gate is blocked", () => {
  const core = greenCoreReport();
  const owner = buildReleaseVerifyOwnerReport();

  expect(core.final_status).toBe("GREEN_RELEASE_CORE_BASELINE_READY");
  expect(core.final_status).not.toBe("GREEN_PRODUCTION_RELEASE_STATE_CLEANUP_READY");
  expect(owner.final_status).toBe("BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE");
  expect(owner.owner_release_verify_passed).toBe(false);
});
