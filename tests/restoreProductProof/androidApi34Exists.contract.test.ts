import { expectNoFakeGreen, readRestoreProofJson } from "./restoreProofTestHelpers";

describe("Android API34 restore proof", () => {
  it("accepts API34 only and never API36 as a substitute", () => {
    const android = readRestoreProofJson("android_api34.json");
    expect(android.android_api_required).toBe(34);
    expect(android.android_api_actual).toBe(34);
    expect(android.api36_used_as_substitute).toBe(false);
    expect(android.android_api34_passed).toBe(true);
    expectNoFakeGreen(android, "android_api34.json");
  });
});
