import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("foreman AI live transcript value", () => {
  it("answers as a production-useful foreman assistant", () => {
    expectRoleLiveValue("foreman");
  });
});

