import { expectRoleLiveValue } from "./roleAiLiveValueTestHelpers";

describe("accountant AI live transcript value", () => {
  it("answers as a production-useful accountant assistant", () => {
    expectRoleLiveValue("accountant");
  });
});

