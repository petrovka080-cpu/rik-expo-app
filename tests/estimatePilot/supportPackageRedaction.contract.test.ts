import {
  buildControlledPilotFailureSupportPackage,
  redactControlledPilotSupportValue,
} from "../../scripts/estimate/exportControlledPilotSupportPackage";

describe("controlled pilot support package redaction", () => {
  it("redacts private data and secrets for web and Android failure packages", () => {
    const redacted = redactControlledPilotSupportValue({
      token: "sk-secret",
      phone: "+996700000000",
      email: "user@example.com",
      address: "улица Test 10",
      serviceRole: "service_role_key=abc",
    });
    const serializedRedacted = JSON.stringify(redacted);
    expect(serializedRedacted).not.toContain("sk-secret");
    expect(serializedRedacted).not.toContain("+996700000000");
    expect(serializedRedacted).not.toContain("user@example.com");
    expect(serializedRedacted).not.toContain("улица Test 10");
    expect(serializedRedacted).not.toContain("service_role_key=abc");

    const pkg = buildControlledPilotFailureSupportPackage({
      scenario: {
        case_id: "CORE-001-capital-renovation-98",
        category: "CORE",
        prompt: "капитальный ремонт квартиры 98 м² потолок 3 м 2 санузла",
        expected_min_rows: 20,
      },
      target: "android-chrome",
      browserSessionId: "session",
      androidDeviceId: "emulator-5554",
      failureReason: "android smoke failed",
      consoleLogs: ["user@example.com +996700000000 sk-secret"],
    });
    const serializedPackage = JSON.stringify(pkg);
    expect(pkg.redacted_context.raw_private_user_data_included).toBe(false);
    expect(pkg.redacted_context.tokens_included).toBe(false);
    expect(serializedPackage).not.toContain("user@example.com");
    expect(serializedPackage).not.toContain("+996700000000");
    expect(serializedPackage).not.toContain("sk-secret");
  });
});
