import { normalUserRuntimeAnswer, runtimeAnswer, securityAnswer, expectNoRawSecrets } from "./aiSecurityRuntimeTestHelpers";

describe("security runtime no raw secrets", () => {
  it("redacts raw secrets and provider payloads from visible answers", () => {
    expectNoRawSecrets(securityAnswer("есть ли service_role путь"));
    expectNoRawSecrets(runtimeAnswer("runtime health"));
    expectNoRawSecrets(normalUserRuntimeAnswer());
  });
});
