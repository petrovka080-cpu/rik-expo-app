import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("marketplace AI live transcript value", () => {
  it("answers as a production-useful marketplace assistant", () => {
    expectRoleLiveValue("marketplace");
  });
});

