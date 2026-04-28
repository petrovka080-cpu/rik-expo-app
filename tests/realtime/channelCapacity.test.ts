import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts/realtime/channelCapacity.mjs");

function runCapacity(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args, "--json"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      EXPO_PUBLIC_SUPABASE_URL: "https://prod-secret-project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon_secret_should_not_print",
      SUPABASE_SERVICE_ROLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.role.signature",
      EXPO_TOKEN: "expo_secret_should_not_print",
    },
  });
}

function parseStdout(result: ReturnType<typeof runCapacity>) {
  expect(result.stdout.trim()).toBeTruthy();
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

describe("realtime channel capacity proof", () => {
  it("emits valid JSON without generating realtime load", () => {
    const result = runCapacity(["--scales", "1000,5000,10000,50000"]);
    const report = parseStdout(result);

    expect(result.status).toBe(0);
    expect(report.wave).toBe("S-RT-4");
    expect(report.status).toBe("GREEN_IMPLEMENTATION_LIMITS_OWNER_ACTION");
    expect(report.productionTouched).toBe(false);
    expect(report.realtimeLoadGenerated).toBe(false);
    expect(report.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        realtimeLoadGenerated: false,
        otaPublished: false,
        easBuildTriggered: false,
        easSubmitTriggered: false,
        easUpdateTriggered: false,
      }),
    );
  });

  it("parses scales and computes deterministic projection math", () => {
    const result = runCapacity(["--scales", "1,10"]);
    const report = parseStdout(result) as {
      channelsPerActiveUser: number;
      projections: Array<{ activeUsers: number; projectedChannels: number }>;
    };

    expect(result.status).toBe(0);
    expect(report.channelsPerActiveUser).toBe(14);
    expect(report.projections).toEqual([
      expect.objectContaining({ activeUsers: 1, projectedChannels: 14 }),
      expect.objectContaining({ activeUsers: 10, projectedChannels: 140 }),
    ]);
  });

  it("rejects invalid scale input", () => {
    const result = runCapacity(["--scales", "1000,-1"]);
    const report = parseStdout(result) as { status: string; errors: string[] };

    expect(result.status).toBe(2);
    expect(report.status).toBe("BLOCKED");
    expect(report.errors.join(" ")).toContain("Invalid --scales");
  });

  it("marks projections unverified when account limits are missing", () => {
    const result = runCapacity(["--scales", "10000"], {
      SUPABASE_REALTIME_MAX_CHANNELS: undefined,
      SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: undefined,
      SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: undefined,
    });
    const report = parseStdout(result) as {
      accountLimitStatus: string;
      capacityClaim: string;
      limits: Record<string, unknown>;
      projections: Array<{ withinVerifiedAccountLimits: boolean | null; reason: string }>;
    };

    expect(result.status).toBe(0);
    expect(report.accountLimitStatus).toBe("owner_action_required");
    expect(report.capacityClaim).toBe("unverified");
    expect(report.limits).toEqual({
      maxChannels: "missing",
      maxConcurrentClients: "missing",
      maxMessagesPerSecond: "missing",
    });
    expect(report.projections[0].withinVerifiedAccountLimits).toBeNull();
    expect(report.projections[0].reason).toContain("account limits are not configured");
  });

  it("checks true and false projections when account limits are provided", () => {
    const within = parseStdout(
      runCapacity(["--scales", "10000"], {
        SUPABASE_REALTIME_MAX_CHANNELS: "200000",
        SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: "20000",
        SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: "100000",
      }),
    ) as { accountLimitStatus: string; projections: Array<{ withinVerifiedAccountLimits: boolean }> };

    expect(within.accountLimitStatus).toBe("verified");
    expect(within.projections[0].withinVerifiedAccountLimits).toBe(true);

    const over = parseStdout(
      runCapacity(["--scales", "10000"], {
        SUPABASE_REALTIME_MAX_CHANNELS: "1000",
        SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: "20000",
        SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: "100000",
      }),
    ) as { projections: Array<{ withinVerifiedAccountLimits: boolean; reason: string }> };

    expect(over.projections[0].withinVerifiedAccountLimits).toBe(false);
    expect(over.projections[0].reason).toContain("exceed provided limits");
  });

  it("redacts dynamic channel names and does not print secrets", () => {
    const result = runCapacity(["--scales", "1000"]);
    const output = result.stdout + result.stderr;
    const report = parseStdout(result) as { bindings: Array<{ channelNamePattern: string }> };

    expect(report.bindings.some((binding) => binding.channelNamePattern === "chat:listing:<redacted>")).toBe(true);
    expect(output).not.toContain("prod-secret-project");
    expect(output).not.toContain("anon_secret_should_not_print");
    expect(output).not.toContain("service.role.signature");
    expect(output).not.toContain("expo_secret_should_not_print");
  });

  it("does not import or call Supabase realtime APIs", () => {
    const source = fs.readFileSync(SCRIPT_PATH, "utf8");

    expect(source).not.toContain("createClient");
    expect(source).not.toContain("supabase.channel");
    expect(source).not.toContain(".channel(");
    expect(source).not.toContain("EXPO_PUBLIC_SUPABASE");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
