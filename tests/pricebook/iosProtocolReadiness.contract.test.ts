import { gitStatusForNativeProtocol } from "./pricebookRatebookTestHelpers";

describe("pricebook iOS protocol readiness contract", () => {
  it("keeps the governance change in JS/TS protocol space without starting an iOS build", () => {
    expect(gitStatusForNativeProtocol()).toBe("");
    expect(process.env.EAS_BUILD_PLATFORM ?? "").not.toBe("ios");
    expect(process.env.IOS_BUILD_STARTED ?? "").not.toBe("true");
  });
});
