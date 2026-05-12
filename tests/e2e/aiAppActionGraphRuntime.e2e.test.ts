import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI app action graph Maestro runner", () => {
  it("runs without fake pass, auth discovery, credential CLI args, or final mutation claims", () => {
    const runner = read("scripts/e2e/runAiAppActionGraphMaestro.ts");

    expect(runner).toContain("runAiAppActionGraphMaestro");
    expect(runner).toContain("GREEN_AI_APP_ACTION_GRAPH_INTERNAL_FIRST_INTEL_READY");
    expect(runner).toContain("BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS");
    expect(runner).toContain("ai.command.center.runtime-status");
    expect(runner).toContain("mutations_created: 0");
    expect(runner).toContain("payment_mutation_observed: false");
    expect(runner).toContain("final_mutation_observed: false");
    expect(runner).toContain("fake_pass_claimed: false");
    expect(runner).not.toContain("listUsers");
    expect(runner).not.toContain("auth.admin");
    expect(runner).not.toContain('"--env"');
    expect(runner).not.toContain('"-e"');
  });
});
