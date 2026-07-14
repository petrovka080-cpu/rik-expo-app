import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("internal key visibility quality guard", () => {
  it("blocks visible internal key-like tokens", () => {
    expectBlockedWith(blockedGateFor("internal_key_visible"), "INTERNAL_KEY_VISIBLE");
  });
});
