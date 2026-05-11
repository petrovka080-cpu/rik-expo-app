import fs from "fs";
import path from "path";

import {
  buildIosSubmitArgs,
  decideIosBuildSubmit,
} from "../../scripts/release/decideIosBuildSubmit";

describe("iOS build submit profile", () => {
  it("requires an App Store compatible non-simulator build profile", () => {
    const eas = JSON.parse(fs.readFileSync(path.join(process.cwd(), "eas.json"), "utf8"));

    expect(eas.build.production.distribution).toBe("store");
    expect(eas.build.production.ios.simulator).toBe(false);
    expect(eas.submit.production.ios.ascAppId).toBeTruthy();
  });

  it("submits by build id through the iOS app-store submit profile", () => {
    expect(buildIosSubmitArgs("build-id-1")).toEqual([
      "submit",
      "--platform",
      "ios",
      "--profile",
      "production",
      "--id",
      "build-id-1",
      "--non-interactive",
      "--wait",
    ]);
  });

  it("requires a new iOS build when the latest build does not match HEAD", () => {
    const decision = decideIosBuildSubmit({
      projectRoot: process.cwd(),
      currentGitCommit: "current-sha",
      builds: [
        {
          id: "old-build",
          platform: "IOS",
          status: "FINISHED",
          buildProfile: "production",
          distribution: "STORE",
          gitCommitHash: "old-sha",
        },
      ],
    });

    expect(decision.mode).toBe("new_ios_build_required");
    expect(decision.buildRequired).toBe(true);
  });
});
