import fs from "node:fs";
import path from "node:path";

import {
  CURRENT_RELEASE_WAVE_SCOPE,
  CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
  currentReleaseWaveScopeArtifact,
  readCurrentReleaseWaveScopeArtifact,
} from "../../scripts/release/currentReleaseWaveScope";
import { expectCurrentIosTestFlightScopeArtifact } from "../helpers/currentReleaseWaveScope";

describe("current release wave scope", () => {
  it("pins iOS internal TestFlight as the only active wave", () => {
    expect(CURRENT_RELEASE_WAVE_SCOPE).toMatchObject({
      wave: "IOS_TESTFLIGHT_INTERNAL_QA",
      internalTestFlightOnly: true,
      requiresReal10000: false,
      requiresCanary: false,
      requiresReleaseCandidate: false,
      requiresFinalReadiness: false,
      requiresSrpc: false,
      requiresSrt: false,
      requiresWarehouseLiveSupabase: false,
      requiresAndroidInstalledArtifactAcceptance: false,
      requiresOwnerReplay: false,
      appReviewSubmitted: false,
      publicBetaEnabled: false,
      productionRolloutEnabled: false,
      externalTestFlightBetaReviewSubmitted: false,
      fakeGreenClaimed: false,
    });
  });

  it("requires the exact committed scope artifact for scoped-out tests", () => {
    expect(fs.existsSync(path.join(process.cwd(), CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH))).toBe(true);
    expect(readCurrentReleaseWaveScopeArtifact()).toEqual(currentReleaseWaveScopeArtifact());
    expect(expectCurrentIosTestFlightScopeArtifact()).toEqual(currentReleaseWaveScopeArtifact());
  });
});
