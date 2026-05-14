import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("developer/control login or shell targetability", () => {
  it("starts core AI runtime targetability flows from a clean login state", () => {
    const runners = [
      "scripts/e2e/runAiCommandCenterTaskStreamRuntimeMaestro.ts",
      "scripts/e2e/runAiCrossScreenRuntimeMaestro.ts",
      "scripts/e2e/runAiProcurementCopilotMaestro.ts",
      "scripts/e2e/runAiCommandCenterApprovalRuntimeMaestro.ts",
    ].map(read);

    for (const runner of runners) {
      expect(runner).toContain("clearState: true");
      expect(runner).toContain("runFlow:");
      expect(runner).toContain('id: "auth.login.screen"');
      expect(runner).toContain("profile-edit-open");
      expect(runner).not.toContain("clearState: false");
    }
  });

  it("keeps the role-screen flows compatible with login and already-authenticated shell states", () => {
    for (const flowName of [
      "director-control-knowledge",
      "foreman-knowledge",
      "buyer-knowledge",
      "accountant-knowledge",
      "contractor-knowledge",
    ]) {
      const flow = read(`tests/e2e/ai-role-screen-knowledge/${flowName}.yaml`);
      expect(flow).toContain("clearState: false");
      expect(flow).toContain("runFlow:");
      expect(flow).toContain('id: "auth.login.screen"');
      expect(flow).toContain("profile-edit-open");
      expect(flow).toContain("openLink: \"rik://ai?context=");
    }
  });
});
