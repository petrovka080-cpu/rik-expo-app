import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("contractor AI live transcript value", () => {
  it("answers as a production-useful contractor assistant", () => {
    expectRoleLiveValue("contractor");
  });
});

