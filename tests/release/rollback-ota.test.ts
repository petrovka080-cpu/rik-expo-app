import { spawnSync } from "node:child_process";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts/release/rollback-ota.mjs");

function runRollback(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args, "--json"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      JEST_WORKER_ID: undefined,
      EXPO_TOKEN: "expo_secret_should_not_print",
      SENTRY_AUTH_TOKEN: "sntrys_secret_should_not_print",
      SUPABASE_SERVICE_ROLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.role.signature",
    },
  });
}

function parseStdout(result: ReturnType<typeof runRollback>) {
  expect(result.stdout.trim()).toBeTruthy();
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

describe("rollback-ota dry-run helper", () => {
  it("defaults to dry-run and records a safe JSON plan", () => {
    const result = runRollback([
      "--target",
      "staging",
      "--channel",
      "staging",
      "--runtime-version",
      "test-runtime",
      "--rollback-to",
      "test-update-id",
    ]);
    const report = parseStdout(result);

    expect(result.status).toBe(0);
    expect(report.status).toBe("dry_run");
    expect(report.execute).toBe(false);
    expect(report.otaPublished).toBe(false);
    expect(report.easUpdateTriggered).toBe(false);
    expect(report.productionTouched).toBe(false);
    expect(report.commandsExecuted).toEqual([]);
    expect(report.commandsPlanned).toEqual([
      expect.objectContaining({
        name: "identify_previous_release_candidate",
        dryRunOnly: true,
        executesInThisHelper: false,
        command: expect.stringContaining("npx eas update:list"),
      }),
      expect.objectContaining({
        name: "render_owner_rollback_republish_command",
        dryRunOnly: true,
        executesInThisHelper: false,
        command: expect.stringContaining("npx eas update:republish"),
      }),
    ]);
    expect(report.previousReleaseCandidate).toMatchObject({
      source: "owner_supplied_rollback_to",
      channel: "staging",
      runtimeVersion: "test-runtime",
      updateGroupOrReleaseRef: "test-update-id",
    });
    expect(report.deployTriggered).toBe(false);
    expect(report.networkCalls).toBe(false);
    expect(report.productionEndpointsCalled).toBe(false);
  });

  it.each([
    [["--channel", "staging", "--runtime-version", "test-runtime", "--rollback-to", "test-update-id"], "Missing required --target."],
    [["--target", "qa", "--channel", "qa", "--runtime-version", "test-runtime", "--rollback-to", "test-update-id"], "Unknown --target"],
    [["--target", "staging", "--runtime-version", "test-runtime", "--rollback-to", "test-update-id"], "Missing required --channel."],
    [["--target", "staging", "--channel", "staging", "--rollback-to", "test-update-id"], "Missing required --runtime-version."],
    [["--target", "staging", "--channel", "staging", "--runtime-version", "test-runtime"], "Missing required --rollback-to."],
  ])("rejects unsafe or incomplete arguments: %s", (args, errorText) => {
    const result = runRollback(args);
    const report = parseStdout(result);

    expect(result.status).toBe(2);
    expect(report.status).toBe("rejected");
    expect(report.errors).toEqual(expect.arrayContaining([expect.stringContaining(errorText)]));
    expect(report.easUpdateTriggered).toBe(false);
    expect(report.otaPublished).toBe(false);
    expect(report.commandsPlanned).toEqual([]);
  });

  it("allows production dry-run but rejects production execute without owner approval", () => {
    const dryRun = runRollback([
      "--target",
      "production",
      "--channel",
      "production",
      "--runtime-version",
      "test-runtime",
      "--rollback-to",
      "test-update-id",
    ]);
    const dryRunReport = parseStdout(dryRun);

    expect(dryRun.status).toBe(0);
    expect(dryRunReport.status).toBe("dry_run");
    expect(dryRunReport.productionTouched).toBe(false);

    const execute = runRollback([
      "--target",
      "production",
      "--channel",
      "production",
      "--runtime-version",
      "test-runtime",
      "--rollback-to",
      "test-update-id",
      "--execute",
    ]);
    const executeReport = parseStdout(execute);

    expect(execute.status).toBe(2);
    expect(executeReport.status).toBe("rejected");
    expect(executeReport.errors).toEqual(
      expect.arrayContaining(["Production execute requires explicit --owner-approved."]),
    );
    expect(executeReport.easUpdateTriggered).toBe(false);
    expect(executeReport.otaPublished).toBe(false);
    expect(executeReport.productionTouched).toBe(false);
    expect(executeReport.commandsExecuted).toEqual([]);
  });

  it("redacts token-like rollback targets and never prints process secrets", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";
    const signedUrl = `https://updates.example/rollback?token=${jwt}&signature=super-secret-signature`;
    const result = runRollback([
      "--target",
      "staging",
      "--channel",
      "staging",
      "--runtime-version",
      "test-runtime",
      "--rollback-to",
      signedUrl,
      "--dry-run",
    ]);
    const output = result.stdout + result.stderr;
    const report = parseStdout(result);

    expect(result.status).toBe(0);
    expect(report.rollbackTo).toContain("[REDACTED]");
    expect(JSON.stringify(report.commandsPlanned)).toContain("[REDACTED]");
    expect(output).not.toContain(jwt);
    expect(output).not.toContain("super-secret-signature");
    expect(output).not.toContain("expo_secret_should_not_print");
    expect(output).not.toContain("sntrys_secret_should_not_print");
    expect(output).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("renders owner rollback commands without executing EAS or touching production", () => {
    const result = runRollback([
      "--target",
      "production",
      "--channel",
      "production",
      "--runtime-version",
      "runtime-prod-1",
      "--rollback-to",
      "prod-update-group-1",
      "--dry-run",
    ]);
    const report = parseStdout(result);

    expect(result.status).toBe(0);
    expect(report.status).toBe("dry_run");
    expect(report.previousReleaseCandidate).toMatchObject({
      source: "owner_supplied_rollback_to",
      channel: "production",
      runtimeVersion: "runtime-prod-1",
      updateGroupOrReleaseRef: "prod-update-group-1",
    });
    expect(report.commandsPlanned).toEqual([
      expect.objectContaining({
        command: 'npx eas update:list --branch "production" --json',
        executesInThisHelper: false,
      }),
      expect.objectContaining({
        command: expect.stringContaining(
          'npx eas update:republish --branch "production" --group "prod-update-group-1"',
        ),
        executesInThisHelper: false,
      }),
    ]);
    expect(report.commandsExecuted).toEqual([]);
    expect(report.otaPublished).toBe(false);
    expect(report.easUpdateTriggered).toBe(false);
    expect(report.deployTriggered).toBe(false);
    expect(report.renderTouched).toBe(false);
    expect(report.dbTouched).toBe(false);
    expect(report.envWritten).toBe(false);
    expect(report.productionBusinessCalls).toBe(false);
    expect(report.productionEndpointsCalled).toBe(false);
    expect(report.networkCalls).toBe(false);
    expect(report.productionTouched).toBe(false);
  });
});
