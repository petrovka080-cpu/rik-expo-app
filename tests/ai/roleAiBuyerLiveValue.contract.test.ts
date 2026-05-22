import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("buyer AI live transcript value", () => {
  it("answers as a production-useful buyer assistant", () => {
    expectRoleLiveValue("buyer");
  });
});

