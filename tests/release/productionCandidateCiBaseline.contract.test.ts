import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

describe("production candidate CI baseline", () => {
  it("defines baseline and heavy workflows without privileged release triggers", () => {
    const baseline = read(".github/workflows/production-candidate-baseline.yml");
    const heavy = read(".github/workflows/production-candidate-heavy-seal.yml");

    for (const workflow of [baseline, heavy]) {
      expect(workflow).toContain("permissions:");
      expect(workflow).toContain("contents: read");
      expect(workflow).toContain("release/production-candidate");
      expect(workflow).not.toContain("pull_request_target");
      expect(workflow).not.toContain("continue-on-error: true");
      expect(workflow).not.toContain("|| true");
      expect(workflow).not.toContain("--confirm-staging-deploy");
      expect(workflow).not.toMatch(/\beas\s+(?:build|submit)\b/);
    }
  });

  it("runs source lineage, static guards, core smoke, and staging dry-run guard", () => {
    const baseline = read(".github/workflows/production-candidate-baseline.yml");

    expect(baseline).toContain("auditProductionCandidateSourceOfTruth.ts");
    expect(baseline).toContain("assertProductionCandidateStaticGuards.ts");
    expect(baseline).toContain("deployRenderStagingAndWaitForLineage.ts --no-write-summary");
    expect(baseline).toContain("npm run verify:typecheck");
    expect(baseline).toContain("npm run lint");
    expect(baseline).toContain("git diff --check");
    expect(baseline).not.toContain("npm run ci:office-market");
    expect(baseline).toContain("npx playwright install chromium --with-deps");
    expect(baseline).toContain("npm run verify:web-public-smoke");
    expect(baseline).toContain("EXPO_PUBLIC_SUPABASE_URL: https://example.invalid");
    expect(baseline).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY: public-smoke-anon-key");
    expect(baseline).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(baseline).toContain("name: web-public-smoke");
    expect(baseline).toContain("artifacts/web-public-smoke.json");
    expect(baseline).toContain("npm run render:build:web");
    expect(baseline).toContain("npm run release:verify:core -- --json");
  });

  it("pins Render staging to the production candidate branch with autodeploy disabled", () => {
    const renderYaml = read("render.yaml");

    expect(renderYaml).toContain("name: rik-expo-app-staging");
    expect(renderYaml).toContain("branch: release/production-candidate");
    expect(renderYaml).toContain("autoDeploy: false");
  });
});
