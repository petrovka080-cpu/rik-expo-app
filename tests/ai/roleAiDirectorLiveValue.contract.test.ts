import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("director AI live transcript value", () => {
  it("answers as a production-useful director assistant", () => {
    expectRoleLiveValue("director");
  });
});

