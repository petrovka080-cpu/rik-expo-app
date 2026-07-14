import { readFileSync } from "node:fs";

describe("staging operations runbooks", () => {
  it("documents source sha health kill switch rollback support bundle and no production DB", () => {
    const runbook = readFileSync("docs/operations/ai-estimate-staging-rc-runbook.md", "utf8");
    const incident = readFileSync("docs/operations/ai-estimate-pilot-incident-response.md", "utf8");
    const support = readFileSync("docs/operations/ai-estimate-support-playbook.md", "utf8");
    const combined = `${runbook}\n${incident}\n${support}`;

    expect(runbook).toContain("/api/version");
    expect(runbook).toContain("checkAiEstimateStagingHealth");
    expect(combined).toContain("kill switch");
    expect(combined).toContain("Rollback");
    expect(combined).toContain("approved history");
    expect(combined).toContain("PDF");
    expect(combined).toContain("buyer package");
    expect(combined).toContain("telemetry");
    expect(combined).toContain("redacted support bundle");
    expect(combined).toContain("production DB");
    expect(combined).toContain("STOP");
  });
});
