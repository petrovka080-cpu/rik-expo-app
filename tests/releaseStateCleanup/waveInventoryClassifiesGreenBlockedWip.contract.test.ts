import {
  buildWaveInventory,
  classifyDirtyFiles,
} from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot, writeJson, writeText } from "./releaseStateCleanupTestHelpers";

it("classifies green, blocked, and WIP waves in inventory", () => {
  const root = tempReleaseRoot();
  writeText(
    root,
    "scripts/release/releaseGuard.shared.ts",
    "runOwnerAccountLiveEstimateQualityLockProof.ts\nrunMobileReleaseBuildProof.ts",
  );
  writeJson(root, "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK/matrix.json", {
    final_status: "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE",
    fake_green_claimed: false,
  });
  writeJson(root, "artifacts/S_MOBILE_RELEASE_BUILD/matrix.json", {
    final_status: "BLOCKED_MOBILE_BUILD_DIRTY_WORKTREE",
    fake_green_claimed: false,
  });
  writeJson(root, "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/matrix.json", {
    final_status: "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY",
    fake_green_claimed: false,
  });

  const dirtyScope = classifyDirtyFiles([
    "scripts/e2e/runOwnerAccountLiveEstimateQualityReplay.ts",
    "scripts/release/mobileReleaseBuildCore.ts",
  ]);
  const inventory = buildWaveInventory(root, dirtyScope);

  expect(inventory.final_status).toBe("GREEN_WAVES_INVENTORIED");
  expect(inventory.items.find((item) => item.wave === "S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK")).toMatchObject({
    isBlocked: true,
    ownsDirtyFiles: true,
    releaseGuardRegistered: true,
  });
  expect(inventory.items.find((item) => item.wave === "S_MOBILE_RELEASE_BUILD")).toMatchObject({
    finalStatus: "BLOCKED_MOBILE_BUILD_DIRTY_WORKTREE",
    ownsDirtyFiles: true,
  });
  expect(inventory.items.find((item) => item.wave === "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS")).toMatchObject({
    isGreen: true,
  });
});
