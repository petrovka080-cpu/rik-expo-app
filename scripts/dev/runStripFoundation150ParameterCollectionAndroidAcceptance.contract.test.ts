import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("strip foundation Android Chrome evidence classification", () => {
  it("cannot be presented as native app create/edit evidence", () => {
    const source = readFileSync(resolve(
      "scripts/dev/runStripFoundation150ParameterCollectionAndroidAcceptance.ts",
    ), "utf8");

    expect(source).toContain('platform: "android-chrome"');
    expect(source).toContain('evidenceClass: "MOBILE_WEB_ON_ANDROID_NOT_NATIVE_APP"');
    expect(source).toContain('browserPackage: "com.android.chrome"');
    expect(source).toContain("chromeCdpUsed: true");
    expect(source).toContain("actualNativeAppPackageCovered: false");
    expect(source).toContain("nativeCreateEditClaimAllowed: false");
    expect(source).toContain("03_ANDROID_MOBILE_WEB_CHROME");
    expect(source).not.toContain("/03_ANDROID\"");
  });
});
