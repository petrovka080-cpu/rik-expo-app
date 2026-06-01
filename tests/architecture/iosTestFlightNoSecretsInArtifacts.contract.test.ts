import fs from "node:fs";
import path from "node:path";

import { artifactDir } from "../../scripts/release/iosTestFlightInternalQaCore";

describe("iOS TestFlight internal QA artifact secret boundary", () => {
  it("keeps artifacts free of raw credentials, API tokens, and private keys", () => {
    const dir = artifactDir();
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((file) => path.join(dir, file)) : [];
    const artifactText = files
      .filter((file) => fs.statSync(file).isFile())
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");

    expect(artifactText).not.toMatch(/-----BEGIN (?:EC |RSA |)PRIVATE KEY-----/);
    expect(artifactText).not.toMatch(/\b(?:EXPO_TOKEN|EAS_TOKEN|EXPO_APPLE_ID|EXPO_APPLE_APP_SPECIFIC_PASSWORD|FASTLANE_SESSION)\s*=/);
    expect(artifactText).not.toMatch(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/);
  });
});
