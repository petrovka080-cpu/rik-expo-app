import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("consumer AI live transcript value", () => {
  it("answers as a production-useful consumer assistant", () => {
    expectRoleLiveValue("consumer");
  });
});

