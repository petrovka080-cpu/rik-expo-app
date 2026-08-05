import {
  containsSecuritySensitiveText,
  scanSecuritySensitiveText,
} from "../../src/lib/security/securityPrivacyHardening";

const mutationFixtures = [
  {
    kind: "api_key",
    value: ["sk", "mutationfixture123456"].join("-"),
  },
  {
    kind: "bearer_token",
    value: ["Bearer", "mutation.token.value"].join(" "),
  },
  {
    kind: "private_url",
    value: [
      "https://storage.example.test/private/document.pdf",
      ["sig", "nature=mutation123"].join(""),
    ].join("?"),
  },
  {
    kind: "email",
    value: ["mutation-fixture", "example.test"].join("@"),
  },
  {
    kind: "phone",
    value: ["+996", "700", "123", "456"].join(" "),
  },
  {
    kind: "local_file_path",
    value: ["C:", "Users", "Developer", "secret.txt"].join("\\"),
  },
  {
    kind: "authorization_header",
    value: ["author", "ization: Bearer mutation-header-token"].join(""),
  },
] as const;

describe("security scanner mutation fixtures", () => {
  it.each(mutationFixtures)(
    "turns the security gate RED for $kind",
    ({ kind, value }) => {
      expect(containsSecuritySensitiveText(value)).toBe(true);
      expect(scanSecuritySensitiveText(`mutation:${kind}`, value)).not.toEqual(
        [],
      );
    },
  );

  it("returns GREEN after every injected mutation is removed", () => {
    const cleanEvidence = JSON.stringify({
      status: "GREEN",
      checks: mutationFixtures.map(({ kind }) => ({ kind, detected: true })),
    });
    expect(containsSecuritySensitiveText(cleanEvidence)).toBe(false);
    expect(scanSecuritySensitiveText("clean-evidence.json", cleanEvidence)).toEqual(
      [],
    );
  });
});
