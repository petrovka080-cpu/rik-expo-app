import fs from "node:fs";
import path from "node:path";

describe("Android harness login snapshot reuse", () => {
  it("verifies all filled controls from one fresh password snapshot", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/_shared/androidHarness.ts"),
      "utf8",
    );

    expect(source).toContain(
      "const passwordFillNodes = parseAndroidNodes(passwordFill.screen.xml)",
    );
    expect(source).toContain(
      "verifyAndroidAuthFieldValue(emailAfterPasswordNode, params.user.email).ok",
    );
    expect(source).toContain("refreshedPasswordNode?.password");
    expect(source).toContain(
      "const refreshedLoginNode = findAndroidAuthSubmitNode(passwordFillNodes)",
    );
    expect(source).not.toContain('getStableLoginScreen("submit-ready")');
    expect(source).not.toContain('confirmLoginFieldText("email-confirm"');
    expect(source).not.toContain('confirmLoginFieldText(\n        "email-after-password"');
    expect(source).toContain(
      "startAndroidDevClientProject(packageName, options.devClientPort, { stopApp: false })",
    );
    expect(source).toContain('routes: ["rik:///auth/login"]');
    expect(source).toContain("isAuthenticatedSessionReady(current.xml)");
  });
});
