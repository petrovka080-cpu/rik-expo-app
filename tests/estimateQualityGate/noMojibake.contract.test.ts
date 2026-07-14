import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("mojibake visibility quality guard", () => {
  it("blocks visible mojibake markers", () => {
    expectBlockedWith(blockedGateFor("mojibake_visible"), "MOJIBAKE_FOUND");
  });
});
