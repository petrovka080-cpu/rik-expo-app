import fs from "node:fs";
import path from "node:path";

describe("developer/control full-access runtime E2E runner", () => {
  it("exports the runtime runner without embedding credentials", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runDeveloperControlFullAccessMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("runDeveloperControlFullAccessMaestro");
    expect(source).toContain("BLOCKED_CONTROL_ACCOUNT_ENV_MISSING");
    expect(source).toContain("BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY");
    expect(source).not.toMatch(/password\\s*[:=]\\s*['\"][^'\"]+['\"]/i);
    expect(source).not.toContain("service_role");
  });
});
