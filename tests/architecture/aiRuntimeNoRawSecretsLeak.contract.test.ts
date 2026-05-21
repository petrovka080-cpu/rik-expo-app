import { normalUserRuntimeAnswer, runtimeAnswer, expectNoRawSecrets } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI runtime no raw secrets leak", () => {
  it("does not expose raw secret-like values in runtime answers", () => {
    expectNoRawSecrets(runtimeAnswer("runtime health"));
    expectNoRawSecrets(normalUserRuntimeAnswer());
  });
});
