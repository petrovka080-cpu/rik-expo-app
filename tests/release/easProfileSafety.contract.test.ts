import fs from "fs";
import path from "path";

const easPath = path.join(process.cwd(), "eas.json");

describe("EAS release profile safety", () => {
  const eas = JSON.parse(fs.readFileSync(easPath, "utf8"));

  it("keeps Android emulator and iOS submit profiles separate from OTA", () => {
    expect(eas.build.preview.distribution).toBe("internal");
    expect(eas.build.preview.android.buildType).toBe("apk");
    expect(eas.build.production.distribution).toBe("store");
    expect(eas.build.production.ios.simulator).toBe(false);
    expect(eas.submit.production.ios).toBeDefined();
  });

  it("does not add Android store submit or production OTA behavior to the release gate", () => {
    expect(eas.submit.preview).toBeUndefined();
    expect(eas.build.preview.android.buildType).not.toBe("app-bundle");
    expect(eas.build.preview.channel).toBe("preview");
  });
});
