import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("estimate quality paid control guard", () => {
  it("blocks paid control rows", () => {
    expectBlockedWith(blockedGateFor("paid_control_row"), "PAID_CONTROL_ROW");
  });
});
