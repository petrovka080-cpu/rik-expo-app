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

  it("is exposed as an explicit npm verifier command", () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["verify:production-safe"]).toBe(
      "node node_modules/tsx/dist/cli.mjs scripts/production_safe_verify.ts",
    );
  });
});
