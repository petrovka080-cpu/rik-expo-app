import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("secret-safe Maestro env boundary", () => {
  const runnerSource = read("scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts");

  it("passes credentials through child process env, not CLI args", () => {
    expect(runnerSource).toContain("roleAuthResolution.env");
    expect(runnerSource).toContain("buildMaestroPrefixedRoleEnv");
    expect(runnerSource).toContain("MAESTRO_${key}");
    expect(runnerSource).toContain("spawnSync(command, [...args]");
    expect(runnerSource).toContain("env: {");
    expect(runnerSource).not.toContain('"--env"');
    expect(runnerSource).not.toContain('"-e"');
    expect(runnerSource).not.toContain("E2E_DIRECTOR_PASSWORD=");
    expect(runnerSource).not.toContain("E2E_FOREMAN_PASSWORD=");
    expect(runnerSource).not.toContain("E2E_BUYER_PASSWORD=");
    expect(runnerSource).not.toContain("E2E_ACCOUNTANT_PASSWORD=");
    expect(runnerSource).not.toContain("E2E_CONTRACTOR_PASSWORD=");
  });

  it("captures and redacts command output before returning or throwing", () => {
    expect(runnerSource).toContain('stdio: capture ? "pipe" : "inherit"');
    expect(runnerSource).toContain("redactE2eSecrets");
    expect(runnerSource).toContain("stdout_redacted: true");
    expect(runnerSource).toContain("stderr_redacted: true");
    expect(runnerSource).toContain("credentials_printed: false");
    expect(runnerSource).toContain("fs.rmSync(debugOutputDir");
    expect(runnerSource).not.toContain("--test-output-dir");
  });
});
