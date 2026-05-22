import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("warehouse AI live transcript value", () => {
  it("answers as a production-useful warehouse assistant", () => {
    expectRoleLiveValue("warehouse");
  });
});

