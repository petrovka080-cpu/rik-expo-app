import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "..", "..");
const verifierPath = path.join(projectRoot, "scripts", "production_safe_verify.ts");
const packageJsonPath = path.join(projectRoot, "package.json");

describe("production safe verification contract", () => {
  const source = fs.readFileSync(verifierPath, "utf8");

  it("runs only the approved no-mutation safe verification steps", () => {
    expect(source).toContain("typescript");
    expect(source).toContain("expo-lint");
    expect(source).toContain("public-web-smoke-contract");
    expect(source).toContain("production-safe-verification-contract");
    expect(source).toContain("public-web-smoke");
    expect(source).toContain("maestro-infra");
    expect(source).toContain("maestro-foundation");
    expect(source).toContain("git-diff-check");

    expect(source).not.toMatch(/e2e:maestro:auth|e2e:maestro:critical|e2e:maestro:external-ai/);
    expect(source).not.toMatch(/release:ota|ota:publish|eas\s+update|eas\s+build|eas\s+submit/);
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|createTempUser|signInWithPassword|signUp/);
  });

  it("records explicit production safety invariants in the report", () => {
    for (const field of [
      "authSubmitExecuted: false",
      "registrationSubmitExecuted: false",
      "criticalBusinessSuitesRun: false",
      "productionDbTouched: false",
      "productionBusinessCallsExecuted: false",
      "otaPublished: false",
      "easUpdateTriggered: false",
      "easBuildTriggered: false",
      "easSubmitTriggered: false",
      "secretsPrinted: false",
      "envValuesPrinted: false",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("requires a clean synced release state before reporting GREEN", () => {
    expect(source).toContain("releaseStateOk");
    expect(source).toContain("release-state-not-clean");
    expect(source).toContain("release-state-head-not-origin-main");
    expect(source).toContain('readCommand("git", ["status", "--short"])');
    expect(source).toContain('readCommand("git", ["rev-parse", "HEAD"])');
    expect(source).toContain('readCommand("git", ["rev-parse", "origin/main"])');
    expect(source).toContain('status: blockers.length === 0 ? "GREEN" : "NOT_GREEN"');
  });

  it("validates redacted child evidence artifacts before reporting GREEN", () => {
    expect(source).toContain("validateEvidenceArtifacts");
    expect(source).toContain("validateWebSmokeArtifact");
    expect(source).toContain("validateMaestroArtifact");
    expect(source).toContain("artifacts/web-public-smoke.json");
    expect(source).toContain("artifacts/maestro-infra/report.xml");
    expect(source).toContain("artifacts/maestro-foundation/report.xml");
    expect(source).toContain("web-public-smoke-artifact-not-green");
    expect(source).toContain("artifact-not-passing");
    expect(source).toContain("evidenceArtifacts");
  });

  it("is exposed as an explicit npm verifier command", () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["verify:production-safe"]).toBe(
      "node node_modules/tsx/dist/cli.mjs scripts/production_safe_verify.ts",
    );
  });
});
